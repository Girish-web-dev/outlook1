import type IORedis from "ioredis";
import { getRedisConnection } from "../lib/redis";

export interface ReservationResult {
  allowed: boolean;
  count: number;
  retryAfterMs: number;
  hourWindow: string;
}

export interface MinimumDelayResult {
  allowed: boolean;
  retryAfterMs: number;
}

export interface RedisRateLimitClient {
  eval(script: string, numberOfKeys: number, ...args: (string | number)[]): Promise<unknown>;
  set(key: string, value: string, mode: "EX", seconds: number, condition: "NX"): Promise<"OK" | null>;
}

const hourlyLimitScript = `
local current = redis.call("GET", KEYS[1])
local limit = tonumber(ARGV[1])
local ttl = tonumber(ARGV[2])

if not current then
  redis.call("SET", KEYS[1], 1, "EX", ttl)
  return {1, 1}
end

current = tonumber(current)
if current < limit then
  local nextValue = redis.call("INCR", KEYS[1])
  return {1, nextValue}
end

return {0, current}
`;

const minimumDelayScript = `
local redisTime = redis.call("TIME")
local nowMs = (tonumber(redisTime[1]) * 1000) + math.floor(tonumber(redisTime[2]) / 1000)
local minimumDelayMs = tonumber(ARGV[1])
local lastSendMs = tonumber(redis.call("GET", KEYS[1]) or "0")

if minimumDelayMs == 0 then
  redis.call("SET", KEYS[1], nowMs, "PX", 1000)
  return {1, 0}
end

local elapsedMs = nowMs - lastSendMs
if elapsedMs < minimumDelayMs then
  return {0, minimumDelayMs - elapsedMs}
end

redis.call("SET", KEYS[1], nowMs, "PX", math.max(minimumDelayMs * 4, 1000))
return {1, 0}
`;

function parseRedisTuple(reply: unknown): [number, number] {
  if (!Array.isArray(reply) || reply.length < 2) {
    throw new Error("Unexpected Redis script response");
  }

  return [Number(reply[0]), Number(reply[1])];
}

function sanitizeScope(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9@._-]/g, "_");
}

export function getHourWindow(date = new Date()): string {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  return `${year}${month}${day}${hour}`;
}

export function getMillisecondsUntilNextHour(date = new Date()): number {
  const nextHour = Date.UTC(
    date.getUTCFullYear(),
    date.getUTCMonth(),
    date.getUTCDate(),
    date.getUTCHours() + 1,
    0,
    0,
    0
  );
  return Math.max(nextHour - date.getTime(), 1000);
}

export class RateLimitService {
  constructor(private readonly client?: RedisRateLimitClient) {}

  async reserveHourlySlot(senderEmail: string, limit: number, now = new Date()): Promise<ReservationResult> {
    const hourWindow = getHourWindow(now);
    const key = `email:rate:${sanitizeScope(senderEmail)}:${hourWindow}`;
    const ttlSeconds = Math.ceil(getMillisecondsUntilNextHour(now) / 1000) + 3600;
    const reply = await this.getClient().eval(hourlyLimitScript, 1, key, limit, ttlSeconds);
    const [allowed, count] = parseRedisTuple(reply);

    return {
      allowed: allowed === 1,
      count,
      retryAfterMs: allowed === 1 ? 0 : getMillisecondsUntilNextHour(now),
      hourWindow
    };
  }

  async reserveMinimumDelay(minimumDelaySeconds: number): Promise<MinimumDelayResult> {
    const minimumDelayMs = minimumDelaySeconds * 1000;
    const reply = await this.getClient().eval(minimumDelayScript, 1, "email:send:last", minimumDelayMs);
    const [allowed, retryAfterMs] = parseRedisTuple(reply);

    return {
      allowed: allowed === 1,
      retryAfterMs
    };
  }

  async shouldNotifyRateLimit(senderEmail: string, hourWindow: string): Promise<boolean> {
    const key = `slack:rate-limit-notified:${sanitizeScope(senderEmail)}:${hourWindow}`;
    const result = await this.getClient().set(key, "1", "EX", 2 * 60 * 60, "NX");
    return result === "OK";
  }

  private getClient(): RedisRateLimitClient {
    return this.client ?? (getRedisConnection() as IORedis);
  }
}

export const rateLimitService = new RateLimitService();

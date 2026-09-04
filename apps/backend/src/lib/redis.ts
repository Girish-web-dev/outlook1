import IORedis from "ioredis";
import { env } from "../config/env";
import { logger } from "./logger";

export const redisOptions = {
  host: env.REDIS_HOST,
  port: env.REDIS_PORT,
  password: env.REDIS_PASSWORD,
  maxRetriesPerRequest: null,
  connectTimeout: 2000,
  retryStrategy(times: number): number {
    return Math.min(times * 100, 2000);
  }
};

export function createRedisConnection(): IORedis {
  const connection = new IORedis(redisOptions);
  let lastErrorLogAt = 0;
  connection.on("error", (error) => {
    const now = Date.now();
    if (now - lastErrorLogAt > 30_000) {
      lastErrorLogAt = now;
      logger.warn({ err: error }, "Redis connection error");
    }
  });
  return connection;
}

let sharedRedis: IORedis | undefined;

export function getRedisConnection(): IORedis {
  sharedRedis ??= createRedisConnection();
  return sharedRedis;
}

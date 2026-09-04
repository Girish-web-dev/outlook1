import { describe, expect, it } from "vitest";
import {
  getHourWindow,
  getMillisecondsUntilNextHour,
  RateLimitService,
  type RedisRateLimitClient
} from "../services/rateLimitService";

class FakeRedis implements RedisRateLimitClient {
  private count = 0;
  private readonly notificationKeys = new Set<string>();

  async eval(_script: string, _numberOfKeys: number, _key: string, limitOrDelay: string | number): Promise<unknown> {
    const limit = Number(limitOrDelay);
    if (limit > 1000) {
      return [0, 250];
    }

    if (this.count < limit) {
      this.count += 1;
      return [1, this.count];
    }

    return [0, this.count];
  }

  async set(key: string): Promise<"OK" | null> {
    if (this.notificationKeys.has(key)) {
      return null;
    }

    this.notificationKeys.add(key);
    return "OK";
  }
}

describe("RateLimitService", () => {
  it("builds UTC hour windows and retry durations", () => {
    const date = new Date("2026-09-05T10:30:00.000Z");
    expect(getHourWindow(date)).toBe("2026090510");
    expect(getMillisecondsUntilNextHour(date)).toBe(30 * 60 * 1000);
  });

  it("atomically reserves hourly slots through Redis", async () => {
    const service = new RateLimitService(new FakeRedis());
    const now = new Date("2026-09-05T10:00:00.000Z");

    await expect(service.reserveHourlySlot("sender@example.com", 2, now)).resolves.toMatchObject({
      allowed: true,
      count: 1
    });
    await expect(service.reserveHourlySlot("sender@example.com", 2, now)).resolves.toMatchObject({
      allowed: true,
      count: 2
    });
    await expect(service.reserveHourlySlot("sender@example.com", 2, now)).resolves.toMatchObject({
      allowed: false,
      count: 2
    });
  });

  it("deduplicates Slack notifications with SET NX", async () => {
    const service = new RateLimitService(new FakeRedis());
    await expect(service.shouldNotifyRateLimit("sender@example.com", "2026090510")).resolves.toBe(true);
    await expect(service.shouldNotifyRateLimit("sender@example.com", "2026090510")).resolves.toBe(false);
  });
});

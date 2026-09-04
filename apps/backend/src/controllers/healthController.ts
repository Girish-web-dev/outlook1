import type { Request, Response } from "express";
import { elasticsearchService } from "../integrations/elasticsearch";
import { prisma } from "../lib/prisma";
import { getRedisConnection } from "../lib/redis";

const healthTimeoutMs = 2500;

async function withTimeout<T>(promise: Promise<T>, timeoutValue: T): Promise<T> {
  let timeout: NodeJS.Timeout | undefined;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeout = setTimeout(() => resolve(timeoutValue), healthTimeoutMs);
  });

  try {
    return await Promise.race([
      promise.catch(() => timeoutValue),
      timeoutPromise
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

async function databaseStatus(): Promise<"connected" | "disconnected"> {
  return withTimeout(
    prisma.$queryRaw`SELECT 1`.then(() => "connected" as const),
    "disconnected"
  );
}

async function redisStatus(): Promise<"connected" | "disconnected"> {
  return withTimeout(
    getRedisConnection().ping().then((pong) => (pong === "PONG" ? "connected" : "disconnected")),
    "disconnected"
  );
}

async function elasticsearchStatus(): Promise<"connected" | "disconnected"> {
  return withTimeout(
    elasticsearchService.ping().then((connected) => (connected ? "connected" : "disconnected")),
    "disconnected"
  );
}

export class HealthController {
  async health(_req: Request, res: Response): Promise<void> {
    const [database, redisResult, elasticsearch] = await Promise.all([
      databaseStatus(),
      redisStatus(),
      elasticsearchStatus()
    ]);

    const status = database === "connected" && redisResult === "connected" && elasticsearch === "connected" ? "ok" : "degraded";

    res.json({
      status,
      database,
      redis: redisResult,
      elasticsearch
    });
  }
}

export const healthController = new HealthController();

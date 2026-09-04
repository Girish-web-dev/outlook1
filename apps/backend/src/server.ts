import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { getRedisConnection } from "./lib/redis";
import { emailQueue } from "./queues/emailQueue";
import { createApp } from "./app";

const app = createApp();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "ReachInbox API listening");
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down API");
  server.close(async () => {
    await Promise.allSettled([prisma.$disconnect(), getRedisConnection().quit(), emailQueue.close()]);
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

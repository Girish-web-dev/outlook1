import { env } from "./config/env";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { getRedisConnection } from "./lib/redis";
import { emailQueue } from "./queues/emailQueue";
import { createApp } from "./app";
import { EmailWorker } from "./workers/emailWorker";

const app = createApp();

const emailWorker = env.RUN_WORKER_IN_SERVER ? new EmailWorker() : null;
const worker = emailWorker?.start();

const server = app.listen(env.PORT, () => {
  logger.info({ port: env.PORT }, "ReachInbox API listening");

  if (worker) {
    logger.info("BullMQ email worker started inside API process");
  }
});

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down API");

  server.close(async () => {
    await Promise.allSettled([
      worker?.close(),
      prisma.$disconnect(),
      getRedisConnection().quit(),
      emailQueue.close(),
    ]);

    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

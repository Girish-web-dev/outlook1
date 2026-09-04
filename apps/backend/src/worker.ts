import { EmailWorker } from "./workers/emailWorker";
import { logger } from "./lib/logger";
import { prisma } from "./lib/prisma";
import { getRedisConnection } from "./lib/redis";
import { emailQueue } from "./queues/emailQueue";

const emailWorker = new EmailWorker();
const worker = emailWorker.start();

async function shutdown(signal: string): Promise<void> {
  logger.info({ signal }, "Shutting down worker");
  await Promise.allSettled([worker.close(), prisma.$disconnect(), getRedisConnection().quit(), emailQueue.close()]);
  process.exit(0);
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

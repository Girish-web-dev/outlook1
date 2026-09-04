import { Queue } from "bullmq";
import type { Email } from "@prisma/client";
import { createRedisConnection } from "../lib/redis";
import type { EmailJobData } from "../types/domain";
import { EMAIL_JOB_NAME, EMAIL_QUEUE_NAME } from "./constants";

export { EMAIL_JOB_NAME, EMAIL_QUEUE_NAME };

export const emailQueue = new Queue<EmailJobData>(EMAIL_QUEUE_NAME, {
  connection: createRedisConnection(),
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: "exponential",
      delay: 30_000
    },
    removeOnComplete: {
      age: 24 * 60 * 60,
      count: 1000
    },
    removeOnFail: {
      age: 7 * 24 * 60 * 60
    }
  }
});

export interface EmailQueuePort {
  scheduleEmail(email: Pick<Email, "id" | "campaignId" | "userId" | "recipient" | "scheduledAt" | "sequenceNumber">): Promise<string>;
}

export class BullMqEmailQueueProducer implements EmailQueuePort {
  async scheduleEmail(
    email: Pick<Email, "id" | "campaignId" | "userId" | "recipient" | "scheduledAt" | "sequenceNumber">
  ): Promise<string> {
    const jobId = `email-${email.id}`;
    const delay = Math.max(0, email.scheduledAt.getTime() - Date.now());
    const job = await emailQueue.add(
      EMAIL_JOB_NAME,
      {
        emailId: email.id,
        campaignId: email.campaignId,
        userId: email.userId,
        recipient: email.recipient
      },
      {
        jobId,
        delay,
        priority: Math.min(email.sequenceNumber, 2_097_152)
      }
    );

    return String(job.id ?? jobId);
  }
}

export const emailQueueProducer = new BullMqEmailQueueProducer();

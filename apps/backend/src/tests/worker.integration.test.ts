import { QueueEvents } from "bullmq";
import pino from "pino";
import { describe, expect, it, vi } from "vitest";
import type { EmailSenderService } from "../integrations/emailSender";
import type { ElasticsearchService } from "../integrations/elasticsearch";
import type { SlackService } from "../services/slackService";

const runInfrastructureTests = process.env.RUN_INFRA_TESTS === "true";

describe.skipIf(!runInfrastructureTests)("worker infrastructure integration", () => {
  it("processes a BullMQ delayed job once using PostgreSQL and Redis state", async () => {
    const [{ prisma }, { createRedisConnection, getRedisConnection }, queueModule, workerModule, repositoryModule, rateModule] =
      await Promise.all([
        import("../lib/prisma"),
        import("../lib/redis"),
        import("../queues/emailQueue"),
        import("../workers/emailWorker"),
        import("../repositories/emailRepository"),
        import("../services/rateLimitService")
      ]);

    const user = await prisma.user.create({
      data: {
        googleId: `integration-google-${Date.now()}`,
        name: "Integration User",
        email: `integration-${Date.now()}@example.com`
      }
    });

    const campaign = await prisma.campaign.create({
      data: {
        userId: user.id,
        subject: "Integration",
        body: "Hello {{email}}",
        startTime: new Date(),
        delaySeconds: 0,
        hourlyLimit: 20,
        senderEmail: "sender@example.com",
        senderName: "Sender"
      }
    });

    const email = await prisma.email.create({
      data: {
        campaignId: campaign.id,
        userId: user.id,
        recipient: `lead-${Date.now()}@example.com`,
        subject: campaign.subject,
        body: campaign.body,
        senderEmail: campaign.senderEmail,
        senderName: campaign.senderName,
        sequenceNumber: 1,
        scheduledAt: new Date(Date.now() + 100)
      }
    });

    const jobId = `email-${email.id}`;
    await prisma.email.update({
      where: { id: email.id },
      data: { bullJobId: jobId }
    });

    const queueEvents = new QueueEvents(queueModule.EMAIL_QUEUE_NAME, {
      connection: createRedisConnection()
    });
    await queueEvents.waitUntilReady();

    const worker = new workerModule.EmailWorker({
      repository: repositoryModule.emailRepository,
      rateLimiter: rateModule.rateLimitService,
      sender: {
        send: vi.fn(async () => ({
          messageId: "integration-message",
          previewUrl: "https://ethereal.example/preview"
        }))
      } as unknown as EmailSenderService,
      search: {
        indexEmail: vi.fn(async () => undefined)
      } as unknown as ElasticsearchService,
      slack: {
        sendRateLimitNotification: vi.fn(async () => undefined)
      } as unknown as SlackService,
      logger: pino({ enabled: false })
    }).start();

    try {
      const job = await queueModule.emailQueue.add(
        queueModule.EMAIL_JOB_NAME,
        {
          emailId: email.id,
          campaignId: campaign.id,
          userId: user.id,
          recipient: email.recipient
        },
        { jobId, delay: 100, attempts: 1 }
      );

      await job.waitUntilFinished(queueEvents, 15_000);
      const updated = await prisma.email.findUniqueOrThrow({ where: { id: email.id } });

      expect(updated.status).toBe("sent");
      expect(updated.messageId).toBe("integration-message");
    } finally {
      await worker.close();
      await queueEvents.close();
      await queueModule.emailQueue.close();
      await prisma.user.delete({ where: { id: user.id } });
      await Promise.allSettled([getRedisConnection().quit(), prisma.$disconnect()]);
    }
  });
});

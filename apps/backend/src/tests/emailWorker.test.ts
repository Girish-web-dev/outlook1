import type { Campaign, Email } from "@prisma/client";
import type { Job } from "bullmq";
import pino from "pino";
import { describe, expect, it, vi } from "vitest";
import type { EmailSenderService } from "../integrations/emailSender";
import type { ElasticsearchService } from "../integrations/elasticsearch";
import type { EmailRepositoryPort, EmailWithCampaign } from "../repositories/emailRepository";
import type { RateLimitService } from "../services/rateLimitService";
import type { SlackService } from "../services/slackService";
import type { EmailJobData } from "../types/domain";
import { EmailWorker, type EmailWorkerDependencies } from "../workers/emailWorker";

function makeCampaign(): Campaign {
  return {
    id: "campaign-1",
    userId: "user-1",
    subject: "Hello",
    body: "Body",
    startTime: new Date("2026-09-05T10:00:00.000Z"),
    delaySeconds: 2,
    hourlyLimit: 200,
    senderEmail: "sender@example.com",
    senderName: "Sender",
    createdAt: new Date("2026-09-04T00:00:00.000Z"),
    updatedAt: new Date("2026-09-04T00:00:00.000Z")
  };
}

function makeEmail(status: Email["status"] = "scheduled"): EmailWithCampaign {
  const campaign = makeCampaign();
  return {
    id: "email-1",
    campaignId: campaign.id,
    userId: "user-1",
    recipient: "lead@example.com",
    subject: "Hello",
    body: "Body",
    senderEmail: "sender@example.com",
    senderName: "Sender",
    sequenceNumber: 1,
    scheduledAt: new Date("2026-09-05T10:00:00.000Z"),
    sentAt: null,
    status,
    failureReason: null,
    bullJobId: "email-email-1",
    messageId: null,
    previewUrl: null,
    createdAt: new Date("2026-09-04T00:00:00.000Z"),
    updatedAt: new Date("2026-09-04T00:00:00.000Z"),
    campaign
  };
}

function makeJob(): Job<EmailJobData> {
  return {
    id: "job-1",
    token: "token-1",
    data: {
      emailId: "email-1",
      campaignId: "campaign-1",
      userId: "user-1",
      recipient: "lead@example.com"
    },
    opts: { attempts: 3 },
    attemptsMade: 0,
    moveToDelayed: vi.fn(async () => undefined)
  } as unknown as Job<EmailJobData>;
}

function makeDependencies(email: EmailWithCampaign, claimResult = true): EmailWorkerDependencies {
  const toEmailRow = (value: EmailWithCampaign, status: Email["status"]): Email => ({
    id: value.id,
    campaignId: value.campaignId,
    userId: value.userId,
    recipient: value.recipient,
    subject: value.subject,
    body: value.body,
    senderEmail: value.senderEmail,
    senderName: value.senderName,
    sequenceNumber: value.sequenceNumber,
    scheduledAt: value.scheduledAt,
    sentAt: value.sentAt,
    status,
    failureReason: value.failureReason,
    bullJobId: value.bullJobId,
    messageId: value.messageId,
    previewUrl: value.previewUrl,
    createdAt: value.createdAt,
    updatedAt: value.updatedAt
  });
  const repository: EmailRepositoryPort = {
    findForWorker: vi.fn(async () => email),
    claimScheduled: vi.fn(async () => claimResult),
    deferEmail: vi.fn(async () => toEmailRow(email, "scheduled")),
    markSent: vi.fn(async () => {
      const sentEmail: Email = {
        ...toEmailRow(email, "sent"),
        sentAt: new Date("2026-09-05T10:00:02.000Z"),
        messageId: "message-1"
      };
      return sentEmail;
    }),
    markFailed: vi.fn(async () => toEmailRow(email, "failed")),
    resetAfterTransientFailure: vi.fn(async () => toEmailRow(email, "scheduled")),
    listByStatuses: vi.fn(async () => []),
    findByUser: vi.fn(async () => null)
  };

  return {
    repository,
    sender: {
      send: vi.fn(async () => ({ messageId: "message-1", previewUrl: "https://ethereal.test/message" }))
    } as unknown as EmailSenderService,
    rateLimiter: {
      reserveMinimumDelay: vi.fn(async () => ({ allowed: true, retryAfterMs: 0 })),
      reserveHourlySlot: vi.fn(async () => ({
        allowed: true,
        count: 1,
        retryAfterMs: 0,
        hourWindow: "2026090510"
      })),
      shouldNotifyRateLimit: vi.fn(async () => false)
    } as unknown as RateLimitService,
    search: {
      indexEmail: vi.fn(async () => undefined)
    } as unknown as ElasticsearchService,
    slack: {
      sendRateLimitNotification: vi.fn(async () => undefined)
    } as unknown as SlackService,
    logger: pino({ enabled: false })
  };
}

describe("EmailWorker", () => {
  it("sends a claimed scheduled email once", async () => {
    const deps = makeDependencies(makeEmail());
    const worker = new EmailWorker(deps);

    await worker.process(makeJob());

    expect(deps.repository.claimScheduled).toHaveBeenCalledWith("email-1");
    expect(deps.sender.send).toHaveBeenCalledTimes(1);
    expect(deps.repository.markSent).toHaveBeenCalledTimes(1);
  });

  it("skips a job when the email is already sent", async () => {
    const deps = makeDependencies(makeEmail("sent"));
    const worker = new EmailWorker(deps);

    await worker.process(makeJob());

    expect(deps.repository.claimScheduled).not.toHaveBeenCalled();
    expect(deps.sender.send).not.toHaveBeenCalled();
  });

  it("does not send when another worker already claimed the row", async () => {
    const deps = makeDependencies(makeEmail(), false);
    const worker = new EmailWorker(deps);

    await worker.process(makeJob());

    expect(deps.repository.claimScheduled).toHaveBeenCalledWith("email-1");
    expect(deps.sender.send).not.toHaveBeenCalled();
  });

  it("defers the job and sends one Slack notification when the hourly limit is reached", async () => {
    const deps = makeDependencies(makeEmail());
    vi.mocked(deps.rateLimiter.reserveHourlySlot).mockResolvedValue({
      allowed: false,
      count: 200,
      retryAfterMs: 60_000,
      hourWindow: "2026090510"
    });
    vi.mocked(deps.rateLimiter.shouldNotifyRateLimit).mockResolvedValue(true);
    const job = makeJob();
    const worker = new EmailWorker(deps);

    await expect(worker.process(job)).rejects.toMatchObject({ name: "DelayedError" });

    expect(deps.repository.deferEmail).toHaveBeenCalledWith(
      "email-1",
      expect.any(Date),
      "hourly rate limit reached"
    );
    expect(job.moveToDelayed).toHaveBeenCalledWith(expect.any(Number), "token-1");
    expect(deps.slack.sendRateLimitNotification).toHaveBeenCalledTimes(1);
    expect(deps.sender.send).not.toHaveBeenCalled();
  });
});

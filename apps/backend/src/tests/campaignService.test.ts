import type { Campaign, Email } from "@prisma/client";
import { describe, expect, it, vi } from "vitest";
import { CampaignService } from "../services/campaignService";
import type {
  CampaignRepositoryPort,
  CreateCampaignInput
} from "../repositories/campaignRepository";
import type { EmailQueuePort } from "../queues/emailQueue";
import type { ElasticsearchService } from "../integrations/elasticsearch";

function makeCampaign(input: CreateCampaignInput): Campaign {
  return {
    id: "campaign-1",
    userId: input.userId,
    subject: input.subject,
    body: input.body,
    startTime: input.startTime,
    delaySeconds: input.delaySeconds,
    hourlyLimit: input.hourlyLimit,
    senderEmail: input.sender.email,
    senderName: input.sender.name ?? null,
    createdAt: new Date("2026-09-04T00:00:00.000Z"),
    updatedAt: new Date("2026-09-04T00:00:00.000Z")
  };
}

function makeEmail(input: CreateCampaignInput, campaign: Campaign, recipient: string, index: number): Email {
  return {
    id: `email-${index + 1}`,
    campaignId: campaign.id,
    userId: input.userId,
    recipient,
    subject: input.subject,
    body: input.body,
    senderEmail: input.sender.email,
    senderName: input.sender.name ?? null,
    sequenceNumber: index + 1,
    scheduledAt: new Date(input.startTime.getTime() + index * input.delaySeconds * 1000),
    sentAt: null,
    status: "scheduled",
    failureReason: null,
    bullJobId: null,
    messageId: null,
    previewUrl: null,
    createdAt: new Date("2026-09-04T00:00:00.000Z"),
    updatedAt: new Date("2026-09-04T00:00:00.000Z")
  };
}

describe("CampaignService", () => {
  it("deduplicates recipients and schedules deterministic email jobs", async () => {
    let capturedRecipients: string[] = [];
    const emailsById = new Map<string, Email>();
    const repository: CampaignRepositoryPort = {
      async createWithEmails(input) {
        capturedRecipients = input.recipients;
        const campaign = makeCampaign(input);
        const emails = input.recipients.map((recipient, index) => makeEmail(input, campaign, recipient, index));
        for (const email of emails) {
          emailsById.set(email.id, email);
        }
        return { campaign, emails };
      },
      async setEmailBullJobId(emailId, bullJobId) {
        const email = emailsById.get(emailId);
        if (!email) {
          throw new Error("Missing email");
        }
        return { ...email, bullJobId };
      },
      async listByUser() {
        return [];
      },
      async findByUser() {
        return null;
      }
    };
    const queue: EmailQueuePort = {
      scheduleEmail: vi.fn(async (email) => `email-${email.id}`)
    };
    const search = {
      indexEmail: vi.fn(async () => undefined)
    } as unknown as ElasticsearchService;
    const service = new CampaignService(repository, queue, search);

    const result = await service.createCampaign("user-1", {
      subject: "Hello",
      body: "Hi {{email}}",
      startTime: "2026-09-05T10:00:00.000Z",
      delaySeconds: 2,
      hourlyLimit: 200,
      recipients: ["ALEX@example.com", "alex@example.com", "maya@example.com", "bad"]
    });

    expect(capturedRecipients).toEqual(["alex@example.com", "maya@example.com"]);
    expect(result.stats).toEqual({
      totalSubmitted: 4,
      scheduled: 2,
      invalid: 1,
      duplicatesRemoved: 1
    });
    expect(result.emails.map((email) => email.scheduledAt)).toEqual([
      "2026-09-05T10:00:00.000Z",
      "2026-09-05T10:00:02.000Z"
    ]);
    expect(queue.scheduleEmail).toHaveBeenCalledTimes(2);
    expect(search.indexEmail).toHaveBeenCalledTimes(2);
  });
});

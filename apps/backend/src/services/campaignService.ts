import { z } from "zod";
import type { CampaignDto, EmailDto } from "../types/domain";
import { AppError } from "../middleware/error";
import {
  campaignRepository,
  type CampaignRepositoryPort,
  type CreateCampaignInput
} from "../repositories/campaignRepository";
import type { EmailQueuePort } from "../queues/emailQueue";
import { elasticsearchService, type ElasticsearchService } from "../integrations/elasticsearch";
import { normalizeRecipients } from "./recipientService";
import { senderService, type SenderService } from "./senderService";
import { toCampaignDto, toEmailDto } from "./dto";

export const createCampaignSchema = z.object({
  subject: z.string().trim().min(1, "Subject is required"),
  body: z.string().trim().min(1, "Body is required"),
  startTime: z.string().trim().min(1),
  delaySeconds: z.number().int().min(0),
  hourlyLimit: z.number().int().positive(),
  senderEmail: z.string().email().optional(),
  recipients: z.array(z.string().min(1)).min(1)
});

export type CreateCampaignRequest = z.infer<typeof createCampaignSchema>;

export interface CampaignCreationResult {
  campaign: CampaignDto;
  emails: EmailDto[];
  stats: {
    totalSubmitted: number;
    scheduled: number;
    invalid: number;
    duplicatesRemoved: number;
  };
}

export class CampaignService {
  constructor(
    private readonly repository: CampaignRepositoryPort = campaignRepository,
    private readonly queue?: EmailQueuePort,
    private readonly search: ElasticsearchService = elasticsearchService,
    private readonly senders: SenderService = senderService
  ) {}

  async createCampaign(userId: string, request: CreateCampaignRequest): Promise<CampaignCreationResult> {
    const startTime = new Date(request.startTime);
    if (Number.isNaN(startTime.getTime())) {
      throw new AppError(400, "startTime must be a valid ISO date");
    }

    const normalized = normalizeRecipients(request.recipients);
    if (normalized.recipients.length === 0) {
      throw new AppError(400, "At least one valid recipient is required", {
        invalid: normalized.invalid
      });
    }

    let sender;
    try {
      sender = this.senders.getSender(request.senderEmail);
    } catch (error) {
      throw new AppError(400, error instanceof Error ? error.message : "Invalid sender");
    }

    const createInput: CreateCampaignInput = {
      userId,
      subject: request.subject.trim(),
      body: request.body.trim(),
      startTime,
      delaySeconds: request.delaySeconds,
      hourlyLimit: request.hourlyLimit,
      sender,
      recipients: normalized.recipients
    };

    const { campaign, emails } = await this.repository.createWithEmails(createInput);
    const scheduledEmails: EmailDto[] = [];

    for (const email of emails) {
      const queue = await this.getQueue();
      const bullJobId = await queue.scheduleEmail(email);
      const updatedEmail = await this.repository.setEmailBullJobId(email.id, bullJobId);
      await this.search.indexEmail(updatedEmail);
      scheduledEmails.push(toEmailDto(updatedEmail));
    }

    return {
      campaign: toCampaignDto(campaign),
      emails: scheduledEmails,
      stats: {
        totalSubmitted: request.recipients.length,
        scheduled: scheduledEmails.length,
        invalid: normalized.invalid.length,
        duplicatesRemoved: normalized.duplicateCount
      }
    };
  }

  async listCampaigns(userId: string): Promise<(CampaignDto & { emailCount: number })[]> {
    const campaigns = await this.repository.listByUser(userId);
    return campaigns.map((campaign) => ({
      ...toCampaignDto(campaign),
      emailCount: campaign._count.emails
    }));
  }

  async getCampaign(userId: string, campaignId: string): Promise<(CampaignDto & { emails: EmailDto[] }) | null> {
    const campaign = await this.repository.findByUser(campaignId, userId);
    if (!campaign) {
      return null;
    }

    return {
      ...toCampaignDto(campaign),
      emails: campaign.emails.map((email) => toEmailDto(email, true))
    };
  }

  private async getQueue(): Promise<EmailQueuePort> {
    if (this.queue) {
      return this.queue;
    }

    const { emailQueueProducer } = await import("../queues/emailQueue");
    return emailQueueProducer;
  }
}

export const campaignService = new CampaignService();

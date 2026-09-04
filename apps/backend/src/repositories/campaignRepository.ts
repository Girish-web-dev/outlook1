import type { Campaign, Email, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma";
import type { SenderConfig } from "../types/domain";

export interface CreateCampaignInput {
  userId: string;
  subject: string;
  body: string;
  startTime: Date;
  delaySeconds: number;
  hourlyLimit: number;
  sender: SenderConfig;
  recipients: string[];
}

export interface CreatedCampaignWithEmails {
  campaign: Campaign;
  emails: Email[];
}

export interface CampaignRepositoryPort {
  createWithEmails(input: CreateCampaignInput): Promise<CreatedCampaignWithEmails>;
  setEmailBullJobId(emailId: string, bullJobId: string): Promise<Email>;
  listByUser(userId: string): Promise<(Campaign & { _count: { emails: number } })[]>;
  findByUser(campaignId: string, userId: string): Promise<(Campaign & { emails: Email[] }) | null>;
}

export class PrismaCampaignRepository implements CampaignRepositoryPort {
  async createWithEmails(input: CreateCampaignInput): Promise<CreatedCampaignWithEmails> {
    return prisma.$transaction(async (tx) => {
      const campaign = await tx.campaign.create({
        data: {
          userId: input.userId,
          subject: input.subject,
          body: input.body,
          startTime: input.startTime,
          delaySeconds: input.delaySeconds,
          hourlyLimit: input.hourlyLimit,
          senderEmail: input.sender.email,
          senderName: input.sender.name
        }
      });

      const emailRows: Prisma.EmailCreateManyInput[] = input.recipients.map((recipient, index) => ({
        campaignId: campaign.id,
        userId: input.userId,
        recipient,
        subject: input.subject,
        body: input.body,
        senderEmail: input.sender.email,
        senderName: input.sender.name,
        sequenceNumber: index + 1,
        scheduledAt: new Date(input.startTime.getTime() + index * input.delaySeconds * 1000)
      }));

      await tx.email.createMany({
        data: emailRows,
        skipDuplicates: true
      });

      const emails = await tx.email.findMany({
        where: { campaignId: campaign.id },
        orderBy: { sequenceNumber: "asc" }
      });

      return { campaign, emails };
    });
  }

  async setEmailBullJobId(emailId: string, bullJobId: string): Promise<Email> {
    return prisma.email.update({
      where: { id: emailId },
      data: { bullJobId }
    });
  }

  async listByUser(userId: string): Promise<(Campaign & { _count: { emails: number } })[]> {
    return prisma.campaign.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      include: {
        _count: {
          select: { emails: true }
        }
      }
    });
  }

  async findByUser(campaignId: string, userId: string): Promise<(Campaign & { emails: Email[] }) | null> {
    return prisma.campaign.findFirst({
      where: { id: campaignId, userId },
      include: {
        emails: {
          orderBy: { sequenceNumber: "asc" }
        }
      }
    });
  }
}

export const campaignRepository = new PrismaCampaignRepository();

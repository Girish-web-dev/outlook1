import type { Campaign, Email, EmailStatus } from "@prisma/client";
import { prisma } from "../lib/prisma";

export type EmailWithCampaign = Email & { campaign: Campaign };

export interface EmailRepositoryPort {
  findForWorker(emailId: string): Promise<EmailWithCampaign | null>;
  claimScheduled(emailId: string): Promise<boolean>;
  deferEmail(emailId: string, nextScheduledAt: Date, reason: string): Promise<Email>;
  markSent(emailId: string, input: { messageId: string; previewUrl?: string; sentAt: Date }): Promise<Email>;
  markFailed(emailId: string, reason: string): Promise<Email>;
  resetAfterTransientFailure(emailId: string, reason: string): Promise<Email>;
  listByStatuses(userId: string, statuses: EmailStatus[], page: number, pageSize: number): Promise<Email[]>;
  findByUser(emailId: string, userId: string): Promise<Email | null>;
}

export class PrismaEmailRepository implements EmailRepositoryPort {
  async findForWorker(emailId: string): Promise<EmailWithCampaign | null> {
    return prisma.email.findUnique({
      where: { id: emailId },
      include: { campaign: true }
    });
  }

  async claimScheduled(emailId: string): Promise<boolean> {
    const result = await prisma.email.updateMany({
      where: {
        id: emailId,
        status: "scheduled"
      },
      data: {
        status: "processing",
        failureReason: null
      }
    });

    return result.count === 1;
  }

  async deferEmail(emailId: string, nextScheduledAt: Date, reason: string): Promise<Email> {
    return prisma.email.update({
      where: { id: emailId },
      data: {
        status: "scheduled",
        scheduledAt: nextScheduledAt,
        failureReason: reason
      }
    });
  }

  async markSent(
    emailId: string,
    input: { messageId: string; previewUrl?: string; sentAt: Date }
  ): Promise<Email> {
    return prisma.email.update({
      where: { id: emailId },
      data: {
        status: "sent",
        sentAt: input.sentAt,
        messageId: input.messageId,
        previewUrl: input.previewUrl,
        failureReason: null
      }
    });
  }

  async markFailed(emailId: string, reason: string): Promise<Email> {
    return prisma.email.update({
      where: { id: emailId },
      data: {
        status: "failed",
        failureReason: reason
      }
    });
  }

  async resetAfterTransientFailure(emailId: string, reason: string): Promise<Email> {
    return prisma.email.update({
      where: { id: emailId },
      data: {
        status: "scheduled",
        failureReason: reason
      }
    });
  }

  async listByStatuses(
    userId: string,
    statuses: EmailStatus[],
    page: number,
    pageSize: number
  ): Promise<Email[]> {
    const take = Math.min(Math.max(pageSize, 1), 100);
    const skip = Math.max(page - 1, 0) * take;

    return prisma.email.findMany({
      where: {
        userId,
        status: { in: statuses }
      },
      orderBy: [{ scheduledAt: "asc" }, { sequenceNumber: "asc" }],
      take,
      skip
    });
  }

  async findByUser(emailId: string, userId: string): Promise<Email | null> {
    return prisma.email.findFirst({
      where: {
        id: emailId,
        userId
      }
    });
  }
}

export const emailRepository = new PrismaEmailRepository();

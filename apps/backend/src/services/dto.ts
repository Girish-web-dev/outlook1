import type { Campaign, Email } from "@prisma/client";
import type { CampaignDto, EmailDto } from "../types/domain";

export function toEmailDto(email: Email, includeBody = false): EmailDto {
  return {
    id: email.id,
    campaignId: email.campaignId,
    recipient: email.recipient,
    subject: email.subject,
    body: includeBody ? email.body : undefined,
    senderEmail: email.senderEmail,
    sequenceNumber: email.sequenceNumber,
    scheduledAt: email.scheduledAt.toISOString(),
    sentAt: email.sentAt?.toISOString(),
    status: email.status,
    failureReason: email.failureReason ?? undefined,
    previewUrl: email.previewUrl ?? undefined
  };
}

export function toCampaignDto(campaign: Campaign): CampaignDto {
  return {
    id: campaign.id,
    subject: campaign.subject,
    body: campaign.body,
    startTime: campaign.startTime.toISOString(),
    delaySeconds: campaign.delaySeconds,
    hourlyLimit: campaign.hourlyLimit,
    senderEmail: campaign.senderEmail,
    createdAt: campaign.createdAt.toISOString()
  };
}

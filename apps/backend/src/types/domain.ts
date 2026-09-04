import type { EmailStatus } from "@prisma/client";

export interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

export interface SenderConfig {
  email: string;
  name?: string;
}

export interface EmailJobData {
  emailId: string;
  campaignId: string;
  userId: string;
  recipient: string;
}

export interface EmailDto {
  id: string;
  campaignId: string;
  recipient: string;
  subject: string;
  body?: string;
  senderEmail: string;
  sequenceNumber: number;
  scheduledAt: string;
  sentAt?: string;
  status: EmailStatus;
  failureReason?: string;
  previewUrl?: string;
}

export interface CampaignDto {
  id: string;
  subject: string;
  body: string;
  startTime: string;
  delaySeconds: number;
  hourlyLimit: number;
  senderEmail: string;
  createdAt: string;
}

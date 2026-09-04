import type { Email } from "./email";

export interface CreateCampaignPayload {
  subject: string;
  body: string;
  startTime: string;
  delaySeconds: number;
  hourlyLimit: number;
  recipients: string[];
}

export interface Campaign {
  id: string;
  subject: string;
  body: string;
  startTime: string;
  delaySeconds: number;
  hourlyLimit: number;
  senderEmail: string;
  createdAt: string;
  emailCount?: number;
}

export interface CampaignCreationResponse {
  campaign: Campaign;
  emails: Email[];
  stats: {
    totalSubmitted: number;
    scheduled: number;
    invalid: number;
    duplicatesRemoved: number;
  };
}

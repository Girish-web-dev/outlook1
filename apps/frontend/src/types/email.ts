export type EmailStatus = "scheduled" | "processing" | "sent" | "failed";

export interface Email {
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

export interface EmailListResponse {
  emails: Email[];
  page: number;
  pageSize: number;
}

export interface EmailSearchDocument {
  id: string;
  userId: string;
  campaignId: string;
  recipient: string;
  subject: string;
  body: string;
  status: EmailStatus;
  scheduledAt: string;
  sentAt?: string;
  createdAt: string;
}

import { api } from "./api";
import type { CreateCampaignPayload, CampaignCreationResponse } from "../types/campaign";
import type { Email, EmailListResponse, EmailSearchDocument } from "../types/email";

export async function createCampaign(payload: CreateCampaignPayload): Promise<CampaignCreationResponse> {
  const response = await api.post<CampaignCreationResponse>("/campaigns", payload);
  return response.data;
}

export async function getScheduledEmails(): Promise<Email[]> {
  const response = await api.get<EmailListResponse>("/emails/scheduled");
  return response.data.emails;
}

export async function getSentEmails(): Promise<Email[]> {
  const response = await api.get<EmailListResponse>("/emails/sent");
  return response.data.emails;
}

export async function searchEmails(query: string): Promise<EmailSearchDocument[]> {
  const response = await api.get<{ emails: EmailSearchDocument[] }>("/emails/search", {
    params: { q: query }
  });
  return response.data.emails;
}

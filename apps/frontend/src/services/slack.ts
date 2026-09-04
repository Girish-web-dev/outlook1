import { api, apiOrigin } from "./api";

export interface SlackStatus {
  connected: boolean;
  teamName?: string;
  connectedAt?: string;
}

export async function getSlackStatus(): Promise<SlackStatus> {
  const response = await api.get<SlackStatus>("/slack/status");
  return response.data;
}

export async function disconnectSlack(): Promise<void> {
  await api.post("/slack/disconnect");
}

export function redirectToSlackConnect(): void {
  window.location.href = `${apiOrigin}/api/slack/connect`;
}

import { env } from "../config/env";
import type { SenderConfig } from "../types/domain";

export class SenderService {
  getSender(senderEmail?: string): SenderConfig {
    if (!senderEmail) {
      return env.SENDERS[0];
    }

    const normalized = senderEmail.toLowerCase();
    const sender = env.SENDERS.find((candidate) => candidate.email.toLowerCase() === normalized);

    if (!sender) {
      throw new Error(`Sender is not configured: ${senderEmail}`);
    }

    return sender;
  }
}

export const senderService = new SenderService();

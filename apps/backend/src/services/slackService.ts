import crypto from "node:crypto";
import axios from "axios";
import type { SlackConnection } from "@prisma/client";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { AppError } from "../middleware/error";

interface SlackStatePayload {
  userId: string;
  exp: number;
  nonce: string;
}

interface SlackOAuthResponse {
  ok: boolean;
  access_token?: string;
  team?: {
    id?: string;
    name?: string;
  };
  error?: string;
}

interface SlackPostMessageResponse {
  ok: boolean;
  error?: string;
}

function encodePayload(payload: SlackStatePayload): string {
  return Buffer.from(JSON.stringify(payload)).toString("base64url");
}

function decodePayload(value: string): SlackStatePayload | null {
  try {
    const parsed: unknown = JSON.parse(Buffer.from(value, "base64url").toString("utf8"));
    if (
      typeof parsed === "object" &&
      parsed !== null &&
      "userId" in parsed &&
      "exp" in parsed &&
      "nonce" in parsed &&
      typeof (parsed as { userId?: unknown }).userId === "string" &&
      typeof (parsed as { exp?: unknown }).exp === "number" &&
      typeof (parsed as { nonce?: unknown }).nonce === "string"
    ) {
      return parsed as SlackStatePayload;
    }
  } catch {
    return null;
  }

  return null;
}

export class SlackService {
  buildAuthorizeUrl(userId: string): string {
    if (!env.SLACK_CONFIGURED || !env.SLACK_CLIENT_ID) {
      throw new AppError(503, "Slack OAuth is not configured");
    }

    const state = this.signState({
      userId,
      exp: Date.now() + 10 * 60 * 1000,
      nonce: crypto.randomBytes(16).toString("hex")
    });

    const params = new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      scope: "chat:write,chat:write.public",
      redirect_uri: env.SLACK_REDIRECT_URI,
      state
    });

    return `https://slack.com/oauth/v2/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, state: string): Promise<SlackConnection> {
    if (!env.SLACK_CONFIGURED || !env.SLACK_CLIENT_ID || !env.SLACK_CLIENT_SECRET) {
      throw new AppError(503, "Slack OAuth is not configured");
    }

    const payload = this.verifyState(state);
    if (!payload) {
      throw new AppError(400, "Invalid Slack OAuth state");
    }

    const params = new URLSearchParams({
      client_id: env.SLACK_CLIENT_ID,
      client_secret: env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: env.SLACK_REDIRECT_URI
    });

    const response = await axios.post<SlackOAuthResponse>(
      "https://slack.com/api/oauth.v2.access",
      params,
      {
        headers: {
          "content-type": "application/x-www-form-urlencoded"
        }
      }
    );

    if (!response.data.ok || !response.data.access_token || !response.data.team?.id) {
      throw new AppError(502, "Slack OAuth exchange failed", response.data.error);
    }

    await prisma.slackConnection.updateMany({
      where: {
        userId: payload.userId,
        disconnectedAt: null
      },
      data: {
        disconnectedAt: new Date()
      }
    });

    return prisma.slackConnection.create({
      data: {
        userId: payload.userId,
        accessToken: response.data.access_token,
        teamId: response.data.team.id,
        teamName: response.data.team.name ?? "Slack workspace"
      }
    });
  }

  async getStatus(userId: string): Promise<{ connected: boolean; teamName?: string; connectedAt?: string }> {
    const connection = await this.findActiveConnection(userId);
    if (!connection) {
      return { connected: false };
    }

    return {
      connected: true,
      teamName: connection.teamName,
      connectedAt: connection.connectedAt.toISOString()
    };
  }

  async disconnect(userId: string): Promise<void> {
    await prisma.slackConnection.updateMany({
      where: {
        userId,
        disconnectedAt: null
      },
      data: {
        disconnectedAt: new Date()
      }
    });
  }

  async sendRateLimitNotification(input: {
    userId: string;
    senderEmail: string;
    limit: number;
    count: number;
    hourWindow: string;
  }): Promise<void> {
    const connection = await this.findActiveConnection(input.userId);
    if (!connection) {
      return;
    }

    const text = `Email rate limit reached for sender ${input.senderEmail}. ${input.count} emails have been sent in the current hour. Remaining jobs have been deferred to the next available window.`;

    try {
      const response = await axios.post<SlackPostMessageResponse>(
        "https://slack.com/api/chat.postMessage",
        {
          channel: env.SLACK_NOTIFICATION_CHANNEL,
          text
        },
        {
          headers: {
            authorization: `Bearer ${connection.accessToken}`,
            "content-type": "application/json"
          }
        }
      );

      if (response.data.ok) {
        logger.info(
          { userId: input.userId, senderEmail: input.senderEmail, hourWindow: input.hourWindow },
          "Slack notification sent"
        );
        return;
      }

      logger.warn(
        { slackError: response.data.error, userId: input.userId },
        "Slack notification API call was rejected"
      );
    } catch (error) {
      logger.warn({ err: error, userId: input.userId }, "Slack notification failed");
    }
  }

  private async findActiveConnection(userId: string): Promise<SlackConnection | null> {
    return prisma.slackConnection.findFirst({
      where: {
        userId,
        disconnectedAt: null
      },
      orderBy: {
        connectedAt: "desc"
      }
    });
  }

  private signState(payload: SlackStatePayload): string {
    const body = encodePayload(payload);
    const signature = crypto
      .createHmac("sha256", env.SESSION_SECRET)
      .update(body)
      .digest("base64url");

    return `${body}.${signature}`;
  }

  private verifyState(state: string): SlackStatePayload | null {
    const [body, signature] = state.split(".");
    if (!body || !signature) {
      return null;
    }

    const expected = crypto.createHmac("sha256", env.SESSION_SECRET).update(body).digest("base64url");
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length) {
      return null;
    }

    if (!crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      return null;
    }

    const payload = decodePayload(body);
    if (!payload || payload.exp < Date.now()) {
      return null;
    }

    return payload;
  }
}

export const slackService = new SlackService();

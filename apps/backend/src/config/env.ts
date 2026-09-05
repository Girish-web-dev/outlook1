import path from "node:path";
import dotenv from "dotenv";
import { z } from "zod";
import type { SenderConfig } from "../types/domain";

const envFiles = [
  path.resolve(process.cwd(), ".env"),
  path.resolve(process.cwd(), "../../.env"),
];

for (const envFile of [...new Set(envFiles)]) {
  dotenv.config({ path: envFile });
}

const senderSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
});

function parseInteger(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function parseOptionalInteger(value: string | undefined): number | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function parseSenders(value: string | undefined): SenderConfig[] {
  if (!value) {
    return [{ email: "sender@example.com", name: "ReachInbox Sender" }];
  }

  try {
    const parsed: unknown = JSON.parse(value);
    const result = z.array(senderSchema).min(1).safeParse(parsed);
    if (result.success) {
      return result.data;
    }
  } catch {
    return [{ email: "sender@example.com", name: "ReachInbox Sender" }];
  }

  return [{ email: "sender@example.com", name: "ReachInbox Sender" }];
}

const envSchema = z.object({
  NODE_ENV: z
    .enum(["development", "test", "production"])
    .default("development"),
  PORT: z.number().int().positive(),
  FRONTEND_URL: z.string().url(),
  SESSION_SECRET: z.string().min(12),
  DATABASE_URL: z.string().min(1),
  REDIS_HOST: z.string().min(1),
  REDIS_PORT: z.number().int().positive(),
  REDIS_PASSWORD: z.string().optional(),
  ELASTICSEARCH_URL: z.string().url(),
  ELASTICSEARCH_API_KEY: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().url(),
  SLACK_CLIENT_ID: z.string().optional(),
  SLACK_CLIENT_SECRET: z.string().optional(),
  SLACK_REDIRECT_URI: z.string().url(),
  SLACK_NOTIFICATION_CHANNEL: z.string().min(1),
  ETHEREAL_HOST: z.string().optional(),
  ETHEREAL_PORT: z.number().int().positive().optional(),
  ETHEREAL_USER: z.string().optional(),
  ETHEREAL_PASSWORD: z.string().optional(),
  SENDERS: z.array(senderSchema).min(1),
  WORKER_CONCURRENCY: z.number().int().positive(),
  MIN_SEND_DELAY_SECONDS: z.number().int().nonnegative(),
  MAX_EMAILS_PER_HOUR: z.number().int().positive(),
  LOG_LEVEL: z.string().min(1),
  RUN_WORKER_IN_SERVER: z.boolean().default(false),
});

const parsed = envSchema.parse({
  NODE_ENV: process.env.NODE_ENV ?? "development",
  PORT: parseInteger(process.env.PORT, 4000),
  FRONTEND_URL: process.env.FRONTEND_URL ?? "http://localhost:5173",
  SESSION_SECRET: process.env.SESSION_SECRET ?? "development-session-secret",
  DATABASE_URL:
    process.env.DATABASE_URL ??
    "postgresql://postgres:postgres@localhost:5432/reachinbox",
  REDIS_HOST: process.env.REDIS_HOST ?? "localhost",
  REDIS_PORT: parseInteger(process.env.REDIS_PORT, 6379),
  REDIS_PASSWORD: process.env.REDIS_PASSWORD || undefined,
  ELASTICSEARCH_URL: process.env.ELASTICSEARCH_URL ?? "http://localhost:9200",
  ELASTICSEARCH_API_KEY: process.env.ELASTICSEARCH_API_KEY || undefined,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || undefined,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET || undefined,
  GOOGLE_CALLBACK_URL:
    process.env.GOOGLE_CALLBACK_URL ??
    "http://localhost:4000/api/auth/google/callback",
  SLACK_CLIENT_ID: process.env.SLACK_CLIENT_ID || undefined,
  SLACK_CLIENT_SECRET: process.env.SLACK_CLIENT_SECRET || undefined,
  SLACK_REDIRECT_URI:
    process.env.SLACK_REDIRECT_URI ??
    "http://localhost:4000/api/slack/callback",
  SLACK_NOTIFICATION_CHANNEL:
    process.env.SLACK_NOTIFICATION_CHANNEL ?? "#general",
  ETHEREAL_HOST: process.env.ETHEREAL_HOST || undefined,
  ETHEREAL_PORT: parseOptionalInteger(process.env.ETHEREAL_PORT),
  ETHEREAL_USER: process.env.ETHEREAL_USER || undefined,
  ETHEREAL_PASSWORD: process.env.ETHEREAL_PASSWORD || undefined,
  SENDERS: parseSenders(process.env.SENDERS_JSON),
  WORKER_CONCURRENCY: parseInteger(process.env.WORKER_CONCURRENCY, 5),
  MIN_SEND_DELAY_SECONDS: parseInteger(process.env.MIN_SEND_DELAY_SECONDS, 2),
  MAX_EMAILS_PER_HOUR: parseInteger(process.env.MAX_EMAILS_PER_HOUR, 200),
  LOG_LEVEL: process.env.LOG_LEVEL ?? "info",
  RUN_WORKER_IN_SERVER: process.env.RUN_WORKER_IN_SERVER === "true",
});

export const env = {
  ...parsed,
  IS_PRODUCTION: parsed.NODE_ENV === "production",
  GOOGLE_CONFIGURED: Boolean(
    parsed.GOOGLE_CLIENT_ID && parsed.GOOGLE_CLIENT_SECRET,
  ),
  SLACK_CONFIGURED: Boolean(
    parsed.SLACK_CLIENT_ID && parsed.SLACK_CLIENT_SECRET,
  ),
  ETHEREAL_CONFIGURED: Boolean(
    parsed.ETHEREAL_HOST &&
    parsed.ETHEREAL_PORT &&
    parsed.ETHEREAL_USER &&
    parsed.ETHEREAL_PASSWORD,
  ),
};

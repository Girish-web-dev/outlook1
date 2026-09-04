import { Worker, type Job } from "bullmq";
import type { Logger } from "pino";
import { env } from "../config/env";
import { emailSenderService, type EmailSenderService } from "../integrations/emailSender";
import { elasticsearchService, type ElasticsearchService } from "../integrations/elasticsearch";
import { logger } from "../lib/logger";
import { createRedisConnection } from "../lib/redis";
import { EMAIL_QUEUE_NAME } from "../queues/constants";
import { emailRepository, type EmailRepositoryPort, type EmailWithCampaign } from "../repositories/emailRepository";
import { rateLimitService, type RateLimitService } from "../services/rateLimitService";
import { slackService, type SlackService } from "../services/slackService";
import type { EmailJobData } from "../types/domain";

export interface EmailWorkerDependencies {
  repository: EmailRepositoryPort;
  sender: EmailSenderService;
  rateLimiter: RateLimitService;
  search: ElasticsearchService;
  slack: SlackService;
  logger: Logger;
}

export class EmailWorker {
  private worker?: Worker<EmailJobData>;

  constructor(
    private readonly dependencies: EmailWorkerDependencies = {
      repository: emailRepository,
      sender: emailSenderService,
      rateLimiter: rateLimitService,
      search: elasticsearchService,
      slack: slackService,
      logger
    }
  ) {}

  start(): Worker<EmailJobData> {
    this.worker = new Worker<EmailJobData>(
      EMAIL_QUEUE_NAME,
      async (job) => {
        await this.process(job);
      },
      {
        connection: createRedisConnection(),
        concurrency: env.WORKER_CONCURRENCY
      }
    );

    this.worker.on("completed", (job) => {
      this.dependencies.logger.info({ jobId: job.id, emailId: job.data.emailId }, "job completed");
    });

    this.worker.on("failed", (job, error) => {
      this.dependencies.logger.error(
        { jobId: job?.id, emailId: job?.data.emailId, err: error },
        "job failed"
      );
    });

    this.dependencies.logger.info(
      { queue: EMAIL_QUEUE_NAME, concurrency: env.WORKER_CONCURRENCY },
      "Email worker started"
    );

    return this.worker;
  }

  async process(job: Job<EmailJobData>): Promise<void> {
    const { repository, rateLimiter, slack } = this.dependencies;
    this.dependencies.logger.info({ jobId: job.id, emailId: job.data.emailId }, "job started");

    const email = await repository.findForWorker(job.data.emailId);
    if (!email) {
      this.dependencies.logger.warn({ emailId: job.data.emailId }, "Email row not found for job");
      return;
    }

    if (email.status === "sent") {
      this.dependencies.logger.info({ emailId: email.id }, "Email already sent; skipping duplicate job");
      return;
    }

    const claimed = await repository.claimScheduled(email.id);
    if (!claimed) {
      this.dependencies.logger.info(
        { emailId: email.id, status: email.status },
        "Email was already claimed by another worker"
      );
      return;
    }

    const minimumDelay = await rateLimiter.reserveMinimumDelay(env.MIN_SEND_DELAY_SECONDS);
    if (!minimumDelay.allowed) {
      await this.deferJob(job, email, minimumDelay.retryAfterMs, "minimum send delay");
    }

    const effectiveHourlyLimit = Math.min(email.campaign.hourlyLimit, env.MAX_EMAILS_PER_HOUR);
    const hourlyReservation = await rateLimiter.reserveHourlySlot(email.senderEmail, effectiveHourlyLimit);
    if (!hourlyReservation.allowed) {
      const shouldNotify = await rateLimiter.shouldNotifyRateLimit(
        email.senderEmail,
        hourlyReservation.hourWindow
      );

      if (shouldNotify) {
        await slack.sendRateLimitNotification({
          userId: email.userId,
          senderEmail: email.senderEmail,
          limit: effectiveHourlyLimit,
          count: hourlyReservation.count,
          hourWindow: hourlyReservation.hourWindow
        });
      }

      this.dependencies.logger.warn(
        {
          emailId: email.id,
          senderEmail: email.senderEmail,
          limit: effectiveHourlyLimit,
          retryAfterMs: hourlyReservation.retryAfterMs
        },
        "rate limit reached"
      );
      await this.deferJob(job, email, hourlyReservation.retryAfterMs, "hourly rate limit reached");
    }

    await this.sendClaimedEmail(job, email);
  }

  private async sendClaimedEmail(job: Job<EmailJobData>, email: EmailWithCampaign): Promise<void> {
    const { repository, sender, search } = this.dependencies;

    try {
      const sent = await sender.send(email);
      const updated = await repository.markSent(email.id, {
        messageId: sent.messageId,
        previewUrl: sent.previewUrl,
        sentAt: new Date()
      });
      await search.indexEmail(updated);
      this.dependencies.logger.info(
        { emailId: email.id, messageId: sent.messageId, previewUrl: sent.previewUrl },
        "email sent"
      );
    } catch (error) {
      const reason = error instanceof Error ? error.message : "Unknown email sending error";
      const maxAttempts = typeof job.opts.attempts === "number" ? job.opts.attempts : 1;
      const willRetry = job.attemptsMade + 1 < maxAttempts;
      const updated = willRetry
        ? await repository.resetAfterTransientFailure(email.id, reason)
        : await repository.markFailed(email.id, reason);

      await search.indexEmail(updated);
      this.dependencies.logger.error(
        { err: error, emailId: email.id, willRetry },
        "email failed"
      );
      throw error;
    }
  }

  private async deferJob(
    job: Job<EmailJobData>,
    email: EmailWithCampaign,
    delayMs: number,
    reason: string
  ): Promise<never> {
    const boundedDelay = Math.max(delayMs, 1000);
    const nextScheduledAt = new Date(Date.now() + boundedDelay);
    const updated = await this.dependencies.repository.deferEmail(email.id, nextScheduledAt, reason);
    await this.dependencies.search.indexEmail(updated);
    this.dependencies.logger.info(
      { jobId: job.id, emailId: email.id, delayMs: boundedDelay, reason },
      "job rescheduled"
    );

    await job.moveToDelayed(Date.now() + boundedDelay, job.token);

    const delayedError = new Error("Email job moved back to delayed state");
    delayedError.name = "DelayedError";
    throw delayedError;
  }
}

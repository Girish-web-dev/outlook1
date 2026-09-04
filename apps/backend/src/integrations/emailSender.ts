import nodemailer from "nodemailer";
import type SMTPTransport from "nodemailer/lib/smtp-transport";
import type { Email } from "@prisma/client";
import { env } from "../config/env";
import { logger } from "../lib/logger";

export interface SendEmailResult {
  messageId: string;
  previewUrl?: string;
}

export class EmailSenderService {
  private transporterPromise?: Promise<nodemailer.Transporter<SMTPTransport.SentMessageInfo>>;

  async send(email: Pick<Email, "recipient" | "subject" | "body" | "senderEmail" | "senderName">): Promise<SendEmailResult> {
    const transporter = await this.getTransporter();
    const body = email.body.replaceAll("{{email}}", email.recipient);
    const fromName = email.senderName ?? "ReachInbox";
    const info = await transporter.sendMail({
      from: `"${fromName.replaceAll('"', "'")}" <${email.senderEmail}>`,
      to: email.recipient,
      subject: email.subject,
      text: body,
      html: `<p>${this.escapeHtml(body).replaceAll("\n", "<br>")}</p>`
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    if (previewUrl) {
      logger.info({ previewUrl, recipient: email.recipient }, "Ethereal preview URL created");
    }

    return {
      messageId: String(info.messageId),
      previewUrl
    };
  }

  private async getTransporter(): Promise<nodemailer.Transporter<SMTPTransport.SentMessageInfo>> {
    this.transporterPromise ??= this.createTransporter();
    return this.transporterPromise;
  }

  private async createTransporter(): Promise<nodemailer.Transporter<SMTPTransport.SentMessageInfo>> {
    if (
      env.ETHEREAL_CONFIGURED &&
      env.ETHEREAL_HOST &&
      env.ETHEREAL_PORT &&
      env.ETHEREAL_USER &&
      env.ETHEREAL_PASSWORD
    ) {
      return nodemailer.createTransport({
        host: env.ETHEREAL_HOST,
        port: env.ETHEREAL_PORT,
        secure: env.ETHEREAL_PORT === 465,
        auth: {
          user: env.ETHEREAL_USER,
          pass: env.ETHEREAL_PASSWORD
        }
      });
    }

    const account = await nodemailer.createTestAccount();
    return nodemailer.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: account.user,
        pass: account.pass
      }
    });
  }

  private escapeHtml(value: string): string {
    return value
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  }
}

export const emailSenderService = new EmailSenderService();

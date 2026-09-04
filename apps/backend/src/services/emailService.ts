import type { EmailStatus } from "@prisma/client";
import {
  emailRepository,
  type EmailRepositoryPort
} from "../repositories/emailRepository";
import {
  elasticsearchService,
  type ElasticsearchService,
  type EmailSearchDocument
} from "../integrations/elasticsearch";
import type { EmailDto } from "../types/domain";
import { toEmailDto } from "./dto";

export class EmailService {
  constructor(
    private readonly repository: EmailRepositoryPort = emailRepository,
    private readonly search: ElasticsearchService = elasticsearchService
  ) {}

  async listScheduled(userId: string, page: number, pageSize: number): Promise<EmailDto[]> {
    const emails = await this.repository.listByStatuses(userId, ["scheduled", "processing"], page, pageSize);
    return emails.map((email) => toEmailDto(email));
  }

  async listSent(userId: string, page: number, pageSize: number): Promise<EmailDto[]> {
    const statuses: EmailStatus[] = ["sent", "failed"];
    const emails = await this.repository.listByStatuses(userId, statuses, page, pageSize);
    return emails.map((email) => toEmailDto(email));
  }

  async getEmail(userId: string, emailId: string): Promise<EmailDto | null> {
    const email = await this.repository.findByUser(emailId, userId);
    return email ? toEmailDto(email, true) : null;
  }

  async searchEmails(userId: string, query: string): Promise<EmailSearchDocument[]> {
    return this.search.searchEmails(userId, query);
  }
}

export const emailService = new EmailService();

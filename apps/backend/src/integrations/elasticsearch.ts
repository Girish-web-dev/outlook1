import { Client } from "@elastic/elasticsearch";
import type { Email, EmailStatus, Prisma } from "@prisma/client";
import { env } from "../config/env";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";

const EMAILS_INDEX = "emails";

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

type IndexableEmail = Pick<
  Email,
  | "id"
  | "userId"
  | "campaignId"
  | "recipient"
  | "subject"
  | "body"
  | "status"
  | "scheduledAt"
  | "sentAt"
  | "createdAt"
>;

function toDocument(email: IndexableEmail): EmailSearchDocument {
  return {
    id: email.id,
    userId: email.userId,
    campaignId: email.campaignId,
    recipient: email.recipient,
    subject: email.subject,
    body: email.body,
    status: email.status,
    scheduledAt: email.scheduledAt.toISOString(),
    sentAt: email.sentAt?.toISOString(),
    createdAt: email.createdAt.toISOString()
  };
}

function isEmailSearchDocument(
  value: unknown
): value is EmailSearchDocument {
  return (
    typeof value === "object" &&
    value !== null &&
    "id" in value &&
    "userId" in value &&
    "recipient" in value &&
    "status" in value
  );
}

export class ElasticsearchService {
  private readonly client: Client;
  private ensureIndexPromise?: Promise<void>;

  constructor(
    client = new Client({
      node: env.ELASTICSEARCH_URL,
      requestTimeout: 2000,
      ...(env.ELASTICSEARCH_API_KEY
        ? {
            auth: {
              apiKey: env.ELASTICSEARCH_API_KEY
            }
          }
        : {})
    })
  ) {
    this.client = client;
  }

  async ping(): Promise<boolean> {
    try {
      return await this.client.ping();
    } catch (error) {
      logger.warn({ err: error }, "Elasticsearch ping failed");
      return false;
    }
  }

  async ensureIndex(): Promise<void> {
    this.ensureIndexPromise ??= this.createIndexIfMissing();
    await this.ensureIndexPromise;
  }

  async indexEmail(email: IndexableEmail): Promise<void> {
    try {
      await this.ensureIndex();

      await this.client.index({
        index: EMAILS_INDEX,
        id: email.id,
        document: toDocument(email)
      });
    } catch (error) {
      logger.error(
        { err: error, emailId: email.id },
        "Elasticsearch indexing error"
      );
    }
  }

  async searchEmails(
    userId: string,
    query: string
  ): Promise<EmailSearchDocument[]> {
    try {
      await this.ensureIndex();

      const response =
        await this.client.search<EmailSearchDocument>({
          index: EMAILS_INDEX,
          size: 50,
          query: {
            bool: {
              filter: [{ term: { userId } }],
              must: query.trim()
                ? [
                    {
                      multi_match: {
                        query,
                        fields: [
                          "recipient^3",
                          "subject^2",
                          "body",
                          "status"
                        ]
                      }
                    }
                  ]
                : [{ match_all: {} }]
            }
          }
        });

      return response.hits.hits
        .map((hit) => hit._source)
        .filter(
          (
            source
          ): source is EmailSearchDocument =>
            isEmailSearchDocument(source)
        );
    } catch (error) {
      logger.error(
        { err: error, userId },
        "Elasticsearch search failed; falling back to PostgreSQL"
      );

      const status = this.statusFromQuery(query);

      const searchFilters: Prisma.EmailWhereInput[] = [
        {
          recipient: {
            contains: query,
            mode: "insensitive"
          }
        },
        {
          subject: {
            contains: query,
            mode: "insensitive"
          }
        },
        {
          body: {
            contains: query,
            mode: "insensitive"
          }
        }
      ];

      if (status) {
        searchFilters.push({ status });
      }

      const rows = await prisma.email.findMany({
        where: {
          userId,
          OR: query.trim() ? searchFilters : undefined
        },
        orderBy: {
          createdAt: "desc"
        },
        take: 50
      });

      return rows.map(toDocument);
    }
  }

  private async createIndexIfMissing(): Promise<void> {
    const exists = await this.client.indices.exists({
      index: EMAILS_INDEX
    });

    if (exists) {
      return;
    }

    await this.client.indices.create({
      index: EMAILS_INDEX,
      mappings: {
        properties: {
          id: {
            type: "keyword"
          },
          userId: {
            type: "keyword"
          },
          campaignId: {
            type: "keyword"
          },
          recipient: {
            type: "keyword"
          },
          subject: {
            type: "text"
          },
          body: {
            type: "text"
          },
          status: {
            type: "keyword"
          },
          scheduledAt: {
            type: "date"
          },
          sentAt: {
            type: "date"
          },
          createdAt: {
            type: "date"
          }
        }
      }
    });
  }

  private statusFromQuery(
    query: string
  ): EmailStatus | undefined {
    const normalized = query.trim().toLowerCase();

    if (
      ["scheduled", "processing", "sent", "failed"].includes(
        normalized
      )
    ) {
      return normalized as EmailStatus;
    }

    return undefined;
  }
}

export const elasticsearchService =
  new ElasticsearchService();
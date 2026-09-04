import type { Client } from "@elastic/elasticsearch";
import { describe, expect, it, vi } from "vitest";
import { ElasticsearchService } from "../integrations/elasticsearch";

describe("ElasticsearchService", () => {
  it("searches email documents through the emails index", async () => {
    const client = {
      indices: {
        exists: vi.fn(async () => true),
        create: vi.fn(async () => undefined)
      },
      search: vi.fn(async () => ({
        hits: {
          hits: [
            {
              _source: {
                id: "email-1",
                userId: "user-1",
                campaignId: "campaign-1",
                recipient: "lead@example.com",
                subject: "Hello",
                body: "Body",
                status: "sent",
                scheduledAt: "2026-09-05T10:00:00.000Z",
                sentAt: "2026-09-05T10:00:02.000Z",
                createdAt: "2026-09-04T00:00:00.000Z"
              }
            }
          ]
        }
      })),
      ping: vi.fn(async () => true),
      index: vi.fn(async () => undefined)
    } as unknown as Client;

    const service = new ElasticsearchService(client);
    const results = await service.searchEmails("user-1", "lead");

    expect(results).toHaveLength(1);
    expect(results[0].recipient).toBe("lead@example.com");
    expect(client.search).toHaveBeenCalledWith(
      expect.objectContaining({
        index: "emails"
      })
    );
  });
});

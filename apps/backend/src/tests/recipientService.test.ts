import { describe, expect, it } from "vitest";
import { normalizeEmailAddress, normalizeRecipients } from "../services/recipientService";

describe("recipientService", () => {
  it("normalizes valid email addresses", () => {
    expect(normalizeEmailAddress("  MAILTO:Alex@Example.COM  ")).toBe("alex@example.com");
    expect(normalizeEmailAddress("<maya@example.com>")).toBe("maya@example.com");
  });

  it("removes invalid and duplicate recipients", () => {
    const result = normalizeRecipients([
      "alex@example.com",
      "bad",
      "ALEX@example.com",
      "maya@example.com"
    ]);

    expect(result.recipients).toEqual(["alex@example.com", "maya@example.com"]);
    expect(result.invalid).toEqual(["bad"]);
    expect(result.duplicateCount).toBe(1);
  });
});

import { describe, expect, it } from "vitest";
import { parseCsv, parseText } from "./csvParser";

describe("csvParser", () => {
  it("detects an email address column", () => {
    const result = parseCsv("name,email\nAlex,alex@example.com\nMaya,maya@example.com\nDup,ALEX@example.com");

    expect(result.totalRows).toBe(3);
    expect(result.validEmails).toEqual(["alex@example.com", "maya@example.com"]);
    expect(result.duplicateCount).toBe(1);
  });

  it("scans CSV values when no email column exists", () => {
    const result = parseCsv("name,notes\nAlex,reach alex@example.com\nMaya,maya@example.com");

    expect(result.validEmails).toEqual(["alex@example.com", "maya@example.com"]);
  });

  it("extracts emails from text files", () => {
    const result = parseText("alex@example.com\nnot an email\nmaya@example.com\nalex@example.com");

    expect(result.validEmails).toEqual(["alex@example.com", "maya@example.com"]);
    expect(result.duplicateCount).toBe(1);
  });
});

import Papa from "papaparse";
import { dedupeEmails, emailRegex } from "./validation";

export interface LeadParseResult {
  totalRows: number;
  validEmails: string[];
  invalidCount: number;
  duplicateCount: number;
}

const maxUploadBytes = 2 * 1024 * 1024;

function isEmailColumn(column: string): boolean {
  const normalized = column.trim().toLowerCase().replace(/[\s_-]+/g, " ");
  return normalized === "email" || normalized === "email address";
}

function extractEmailsFromText(value: string): string[] {
  return value.match(emailRegex) ?? [];
}

export async function parseLeadFile(file: File): Promise<LeadParseResult> {
  if (file.size > maxUploadBytes) {
    throw new Error("Upload must be 2 MB or smaller");
  }

  const extension = file.name.split(".").pop()?.toLowerCase();
  const text = await file.text();

  if (extension === "csv") {
    return parseCsv(text);
  }

  if (extension === "txt") {
    return parseText(text);
  }

  throw new Error("Only .csv and .txt lead files are supported");
}

export function parseCsv(text: string): LeadParseResult {
  const withHeaders = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true
  });
  const fields = withHeaders.meta.fields ?? [];
  const emailField = fields.find(isEmailColumn);

  if (emailField) {
    const values = withHeaders.data.map((row) => row[emailField] ?? "");
    const normalized = dedupeEmails(values);
    return {
      totalRows: withHeaders.data.length,
      validEmails: normalized.emails,
      invalidCount: normalized.invalid,
      duplicateCount: normalized.duplicates
    };
  }

  const matrix = Papa.parse<string[]>(text, {
    header: false,
    skipEmptyLines: true
  });
  const values = matrix.data.flatMap((row) => row.flatMap(extractEmailsFromText));
  const normalized = dedupeEmails(values);

  return {
    totalRows: matrix.data.length,
    validEmails: normalized.emails,
    invalidCount: normalized.invalid,
    duplicateCount: normalized.duplicates
  };
}

export function parseText(text: string): LeadParseResult {
  const candidates = extractEmailsFromText(text);
  const normalized = dedupeEmails(candidates);

  return {
    totalRows: text.split(/\r?\n/).filter((line) => line.trim()).length,
    validEmails: normalized.emails,
    invalidCount: normalized.invalid,
    duplicateCount: normalized.duplicates
  };
}

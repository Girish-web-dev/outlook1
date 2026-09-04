export const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;

const exactEmailRegex = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;

export function normalizeEmail(value: string): string | null {
  const normalized = value.trim().replace(/^mailto:/i, "").replace(/^<|>$/g, "").toLowerCase();
  return exactEmailRegex.test(normalized) ? normalized : null;
}

export function dedupeEmails(values: string[]): {
  emails: string[];
  invalid: number;
  duplicates: number;
} {
  const seen = new Set<string>();
  const emails: string[] = [];
  let invalid = 0;
  let duplicates = 0;

  for (const value of values) {
    const normalized = normalizeEmail(value);
    if (!normalized) {
      invalid += 1;
      continue;
    }

    if (seen.has(normalized)) {
      duplicates += 1;
      continue;
    }

    seen.add(normalized);
    emails.push(normalized);
  }

  return { emails, invalid, duplicates };
}

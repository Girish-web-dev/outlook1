export interface RecipientNormalizationResult {
  recipients: string[];
  invalid: string[];
  duplicateCount: number;
}

const emailPattern = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/i;

export function normalizeEmailAddress(value: string): string | null {
  const trimmed = value.trim().replace(/^mailto:/i, "").replace(/^<|>$/g, "");
  const normalized = trimmed.toLowerCase();

  if (!emailPattern.test(normalized)) {
    return null;
  }

  return normalized;
}

export function isValidEmailAddress(value: string): boolean {
  return normalizeEmailAddress(value) !== null;
}

export function normalizeRecipients(values: string[]): RecipientNormalizationResult {
  const seen = new Set<string>();
  const recipients: string[] = [];
  const invalid: string[] = [];
  let duplicateCount = 0;

  for (const value of values) {
    const normalized = normalizeEmailAddress(value);

    if (!normalized) {
      invalid.push(value);
      continue;
    }

    if (seen.has(normalized)) {
      duplicateCount += 1;
      continue;
    }

    seen.add(normalized);
    recipients.push(normalized);
  }

  return {
    recipients,
    invalid,
    duplicateCount
  };
}

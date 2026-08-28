const LABEL_SEPARATORS = /[\s\p{P}\p{S}]+/gu;

export function normalizeLabel(text: string): string {
  return text.normalize("NFKC").replace(LABEL_SEPARATORS, "").toLowerCase();
}

export function normalizeDateText(text: string): string | null {
  const match = text
    .normalize("NFKC")
    .match(/(20\d{2})\s*(?:년|[./-])\s*(\d{1,2})\s*(?:월|[./-])\s*(\d{1,2})\s*일?/);
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return [
    String(year).padStart(4, "0"),
    String(month).padStart(2, "0"),
    String(day).padStart(2, "0"),
  ].join("-");
}

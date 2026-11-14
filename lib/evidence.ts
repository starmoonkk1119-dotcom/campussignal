export function normalizeForMatch(value: string): string {
  return value
    .replace(/[“”„‟«»]/g, "")
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

export function quoteAppearsIn(quote: string, rawText: string): boolean {
  const normalizedQuote = normalizeForMatch(quote);
  if (normalizedQuote.length === 0) {
    return false;
  }

  return normalizeForMatch(rawText).includes(normalizedQuote);
}

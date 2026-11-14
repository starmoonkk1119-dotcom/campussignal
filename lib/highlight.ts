import { normalizeForMatch, quoteAppearsIn } from "./evidence";

export type HighlightRange = {
  start: number;
  end: number;
};

type NormalizedCharacter = {
  character: string;
  start: number;
  end: number;
};

/**
 * Builds the normalized text used by `normalizeForMatch`, while remembering the
 * span of the original string each normalized character came from. That mapping
 * is what lets a matched range be highlighted on the untouched source text.
 */
function normalizeWithMap(value: string): {
  text: string;
  characters: NormalizedCharacter[];
} {
  const characters: NormalizedCharacter[] = [];

  const flushWhitespace = () => {
    if (pendingWhitespaceStart !== null) {
      characters.push({
        character: " ",
        start: pendingWhitespaceStart,
        end: pendingWhitespaceEnd ?? pendingWhitespaceStart + 1,
      });
      pendingWhitespaceStart = null;
      pendingWhitespaceEnd = null;
    }
  };

  let pendingWhitespaceStart: number | null = null;
  let pendingWhitespaceEnd: number | null = null;

  for (let index = 0; index < value.length; index += 1) {
    const originalCharacter = value[index];

    // Dropped by normalizeForMatch, so no normalized character exists for it.
    if (/[“”„‟«»]/.test(originalCharacter)) {
      continue;
    }

    if (/[‘’]/.test(originalCharacter)) {
      flushWhitespace();
      characters.push({ character: "'", start: index, end: index + 1 });
      continue;
    }

    if (/\s/.test(originalCharacter)) {
      if (characters.length > 0) {
        pendingWhitespaceStart ??= index;
        pendingWhitespaceEnd = index + 1;
      }
      continue;
    }

    flushWhitespace();

    // A lowercased character can expand to more than one code point.
    for (const character of originalCharacter.toLowerCase()) {
      characters.push({ character, start: index, end: index + 1 });
    }
  }

  return {
    text: characters.map(({ character }) => character).join(""),
    characters,
  };
}

/**
 * Locates the span in `rawText` that corresponds to `quote`, tolerating the
 * differences `normalizeForMatch` forgives (case, whitespace runs, smart
 * quotes). Returns null rather than approximating when the quote is not really
 * in the text — a fabricated highlight would be worse than no highlight.
 */
export function findHighlightRange(
  rawText: string,
  quote: string | null,
): HighlightRange | null {
  if (quote === null || !quoteAppearsIn(quote, rawText)) {
    return null;
  }

  const normalizedQuote = normalizeForMatch(quote);
  if (normalizedQuote.length === 0) {
    return null;
  }

  const normalizedRawText = normalizeForMatch(rawText);
  const mappedRawText = normalizeWithMap(rawText);

  // If the two normalizations ever disagree, fall back to an exact search
  // instead of trusting a mapping that might be off by a character.
  if (mappedRawText.text !== normalizedRawText) {
    const exactStart = rawText.indexOf(quote);
    return exactStart === -1
      ? null
      : { start: exactStart, end: exactStart + quote.length };
  }

  const normalizedStart = normalizedRawText.indexOf(normalizedQuote);
  if (normalizedStart === -1) {
    return null;
  }

  const firstCharacter = mappedRawText.characters[normalizedStart];
  const lastCharacter =
    mappedRawText.characters[normalizedStart + normalizedQuote.length - 1];

  if (firstCharacter === undefined || lastCharacter === undefined) {
    return null;
  }

  return { start: firstCharacter.start, end: lastCharacter.end };
}

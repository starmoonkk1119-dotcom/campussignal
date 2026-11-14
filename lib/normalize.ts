/**
 * The model is asked to return canonical dot paths and human-readable notes, but
 * it drifts: it may return "minYear" instead of "eligibility.minYear", and it may
 * put bare identifiers such as "maxYear" into uncertainFields. These helpers
 * repair that drift deterministically so the rest of the app can rely on the
 * shapes described in the spec.
 */

const ELIGIBILITY_FIELDS = new Set([
  "minYear",
  "maxYear",
  "minGpa",
  "englishTest",
  "minEnglishScore",
  "majorRequirement",
  "otherConditions",
]);

const TOP_LEVEL_FIELDS = new Set([
  "deadline",
  "requiredDocuments",
  "tags",
  "title",
  "category",
  "organizer",
  "summary",
  "sourceUrl",
]);

/**
 * Maps a model-supplied evidence field onto the canonical dot path used by the
 * UI. Unknown paths are returned unchanged so they can still be displayed.
 */
export function canonicalizeEvidenceField(field: string): string {
  const trimmed = field.trim();

  if (trimmed.startsWith("eligibility.")) {
    return trimmed;
  }

  if (ELIGIBILITY_FIELDS.has(trimmed)) {
    return `eligibility.${trimmed}`;
  }

  return trimmed;
}

/**
 * A note must read as a sentence fragment a student could understand. Bare
 * identifiers ("maxYear") and single words are model noise, not notes, so they
 * are dropped rather than shown in the interface.
 */
export function sanitizeUncertainFields(
  notes: string[],
  optionalNullFields: string[],
): string[] {
  const optional = new Set(optionalNullFields);
  const cleaned: string[] = [];

  for (const note of notes) {
    const trimmed = note.trim();
    if (trimmed.length < 8 || !/\s/.test(trimmed)) {
      continue;
    }

    const leaf = trimmed.startsWith("eligibility.")
      ? trimmed.slice("eligibility.".length)
      : trimmed;
    // "maxYear", "organizer" and "summary" are optional fields; their absence is
    // not something the student needs to verify.
    if (optional.has(leaf) || TOP_LEVEL_FIELDS.has(leaf)) {
      continue;
    }

    cleaned.push(trimmed);
  }

  return [...new Set(cleaned)];
}

/**
 * Fields whose null value is normal and does not require the student's
 * attention. Used to keep optional-null noise out of the verification list.
 */
export function optionalNullFields(parsed: {
  maxYear: number | null;
  organizer: string | null;
  summary: string | null;
  majorRequirement: string | null;
}): string[] {
  const fields: string[] = [];
  if (parsed.maxYear === null) fields.push("maxYear");
  if (parsed.organizer === null) fields.push("organizer");
  if (parsed.summary === null) fields.push("summary");
  if (parsed.majorRequirement === null) fields.push("majorRequirement");
  return fields;
}

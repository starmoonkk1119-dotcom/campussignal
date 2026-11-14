import { NextRequest, NextResponse } from "next/server";

import { getDemoOpportunity } from "@/lib/fixtures";
import { quoteAppearsIn } from "@/lib/evidence";
import { extractOpportunity } from "@/lib/llm";
import {
  canonicalizeEvidenceField,
  optionalNullFields,
  sanitizeUncertainFields,
} from "@/lib/normalize";
import {
  parseOpportunitySchema,
  parseRequestSchema,
  type ParsedOpportunity,
} from "@/lib/parseSchema";
import type { Opportunity } from "@/lib/types";

const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 10;
const rateLimitBuckets = new Map<
  string,
  { count: number; windowStartedAt: number }
>();

type ResponseSource = "model" | "fallback";

function logResult(ok: boolean, source: ResponseSource, startedAt: number) {
  console.log({
    ok,
    source,
    durationMs: Date.now() - startedAt,
  });
}

function errorResponse(
  status: 422 | 429 | 503,
  error: string,
  code: "BAD_INPUT" | "MODEL_ERROR" | "RATE_LIMITED",
  source: ResponseSource,
  startedAt: number,
) {
  logResult(false, source, startedAt);
  return NextResponse.json(
    {
      ok: false,
      error,
      code,
    },
    { status },
  );
}

function requestKey(request: NextRequest): string {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
}

function isRateLimited(key: string): boolean {
  const now = Date.now();
  const current = rateLimitBuckets.get(key);

  if (
    current === undefined ||
    now - current.windowStartedAt >= RATE_LIMIT_WINDOW_MS
  ) {
    rateLimitBuckets.set(key, { count: 1, windowStartedAt: now });
    return false;
  }

  if (current.count >= MAX_REQUESTS_PER_WINDOW) {
    return true;
  }

  current.count += 1;
  return false;
}

function isModelResponseError(error: unknown): boolean {
  return error instanceof Error && error.name === "ModelResponseError";
}

function coerceDeadline(deadline: string | null): string | null {
  if (deadline === null || !/^\d{4}-\d{2}-\d{2}$/.test(deadline)) {
    return null;
  }

  const [year, month, day] = deadline.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }

  return deadline;
}

function fieldIsNullRequirement(
  opportunity: ParsedOpportunity,
  field: string,
): boolean {
  if (field === "deadline") {
    return opportunity.deadline === null;
  }

  if (!field.startsWith("eligibility.")) {
    return false;
  }

  const eligibilityField = field.slice(
    "eligibility.".length,
  ) as keyof ParsedOpportunity["eligibility"];
  return (
    eligibilityField in opportunity.eligibility &&
    opportunity.eligibility[eligibilityField] === null
  );
}

function dedupeDocuments(documents: string[]): string[] {
  const seen = new Set<string>();
  return documents.filter((document) => {
    const key = document.toLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function finalizeOpportunity(
  parsedOpportunity: ParsedOpportunity,
  rawText: string,
  sourceUrl: string | null,
): {
  opportunity: Opportunity;
  warnings: string[];
} {
  const warnings: string[] = [];
  const uncertainFields = sanitizeUncertainFields(
    parsedOpportunity.uncertainFields,
    optionalNullFields({
      maxYear: parsedOpportunity.eligibility.maxYear,
      organizer: parsedOpportunity.organizer,
      summary: parsedOpportunity.summary,
      majorRequirement: parsedOpportunity.eligibility.majorRequirement,
    }),
  );
  const canonicalEvidence = parsedOpportunity.evidence.map((entry) => ({
    ...entry,
    field: canonicalizeEvidenceField(entry.field),
  }));
  const evidence = canonicalEvidence.filter((entry) => {
    if (!quoteAppearsIn(entry.quote, rawText)) {
      const note = `Evidence for ${entry.field} could not be verified against the source text.`;
      uncertainFields.push(note);
      warnings.push(note);
      return false;
    }

    return !fieldIsNullRequirement(parsedOpportunity, entry.field);
  });
  const deadline = coerceDeadline(parsedOpportunity.deadline);

  if (parsedOpportunity.deadline !== null && deadline === null) {
    warnings.push("The deadline was not a valid YYYY-MM-DD date and was set to null.");
  }

  const opportunity: Opportunity = {
    ...parsedOpportunity,
    id: crypto.randomUUID(),
    sourceUrl,
    deadline,
    rawText,
    requiredDocuments: dedupeDocuments(parsedOpportunity.requiredDocuments),
    tags: parsedOpportunity.tags.map((tag) => tag.toLowerCase()),
    uncertainFields: [...new Set(uncertainFields)],
    evidence,
    createdAt: new Date().toISOString(),
  };

  return { opportunity, warnings };
}

function withoutIdentity(
  opportunity: Opportunity,
): Omit<Opportunity, "id" | "createdAt"> {
  const { id, createdAt, ...responseOpportunity } = opportunity;
  void id;
  void createdAt;
  return responseOpportunity;
}

export async function POST(request: NextRequest) {
  const startedAt = Date.now();
  const source: ResponseSource =
    process.env.DEMO_MODE === "true" ? "fallback" : "model";

  // DEMO_MODE never reaches a paid model, so rate limiting it would only stop
  // judges from trying the demo. The limiter exists to protect the API budget.
  if (source === "model" && isRateLimited(requestKey(request))) {
    return errorResponse(
      429,
      "Rate limit exceeded.",
      "RATE_LIMITED",
      source,
      startedAt,
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse(
      422,
      "Invalid request body.",
      "BAD_INPUT",
      source,
      startedAt,
    );
  }

  const requestResult = parseRequestSchema.safeParse(body);
  if (!requestResult.success) {
    return errorResponse(
      422,
      "Invalid request body.",
      "BAD_INPUT",
      source,
      startedAt,
    );
  }

  const { rawText, sourceUrl } = requestResult.data;

  if (source === "fallback") {
    const fixture = getDemoOpportunity();
    const { rawText: fixtureRawText, ...fixtureOpportunity } = fixture;
    const finalized = finalizeOpportunity(
      fixtureOpportunity,
      fixtureRawText,
      sourceUrl,
    );
    logResult(true, source, startedAt);
    return NextResponse.json({
      ok: true,
      source,
      opportunity: withoutIdentity(finalized.opportunity),
      warnings: finalized.warnings,
    });
  }

  let parsedOpportunity: ParsedOpportunity | null = null;
  let transportFailure = false;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    let modelOutput: unknown;
    try {
      modelOutput = await extractOpportunity(rawText);
    } catch (error) {
      if (!isModelResponseError(error)) {
        transportFailure = true;
        break;
      }
      continue;
    }

    const modelResult = parseOpportunitySchema.safeParse(modelOutput);
    if (modelResult.success) {
      parsedOpportunity = modelResult.data;
      break;
    }
  }

  if (transportFailure) {
    return errorResponse(
      503,
      "The model service is unavailable.",
      "MODEL_ERROR",
      source,
      startedAt,
    );
  }

  if (parsedOpportunity === null) {
    return errorResponse(
      422,
      "The model returned invalid opportunity data.",
      "MODEL_ERROR",
      source,
      startedAt,
    );
  }

  const finalized = finalizeOpportunity(
    parsedOpportunity,
    rawText,
    sourceUrl,
  );
  logResult(true, source, startedAt);
  return NextResponse.json({
    ok: true,
    source,
    opportunity: withoutIdentity(finalized.opportunity),
    warnings: finalized.warnings,
  });
}

import { z } from "zod";

const opportunityCategorySchema = z.enum([
  "competition",
  "internship",
  "scholarship",
  "exchange",
  "research",
  "summer_school",
]);

const englishTestSchema = z.enum(["IELTS", "TOEFL"]);

const eligibilitySchema = z
  .object({
    minYear: z.number().nullable(),
    maxYear: z.number().nullable(),
    minGpa: z.number().nullable(),
    englishTest: englishTestSchema.nullable(),
    minEnglishScore: z.number().nullable(),
    majorRequirement: z.string().nullable(),
    otherConditions: z.array(z.string()),
  })
  .strict();

const evidenceEntrySchema = z
  .object({
    field: z.string(),
    quote: z.string(),
  })
  .strict();

export const parseOpportunitySchema = z
  .object({
    title: z.string(),
    category: opportunityCategorySchema,
    organizer: z.string().nullable(),
    summary: z.string().nullable(),
    deadline: z.string().nullable(),
    eligibility: eligibilitySchema,
    requiredDocuments: z.array(z.string()),
    tags: z.array(z.string()),
    uncertainFields: z.array(z.string()),
    evidence: z.array(evidenceEntrySchema),
  })
  .strict();

export const parseRequestSchema = z
  .object({
    rawText: z.string().min(40).max(20000),
    sourceUrl: z.string().nullable(),
  })
  .strict();

export type ParsedOpportunity = z.infer<typeof parseOpportunitySchema>;

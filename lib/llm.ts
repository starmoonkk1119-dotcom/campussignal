import OpenAI from "openai";

const EXTRACTION_SYSTEM_PROMPT = `You extract structured eligibility data from university opportunity announcements.

Return ONE JSON object and nothing else. No markdown fences, no commentary.

Schema:
{
  "title": string,
  "category": "competition" | "internship" | "scholarship" | "exchange" | "research" | "summer_school",
  "organizer": string | null,
  "summary": string | null,
  "deadline": "YYYY-MM-DD" | null,
  "eligibility": {
    "minYear": number | null,
    "maxYear": number | null,
    "minGpa": number | null,
    "englishTest": "IELTS" | "TOEFL" | null,
    "minEnglishScore": number | null,
    "majorRequirement": string | null,
    "otherConditions": string[]
  },
  "requiredDocuments": string[],
  "tags": string[],
  "uncertainFields": string[],
  "evidence": [{ "field": string, "quote": string }]
}

Rules, in priority order:
1. Never infer. If the text does not state a requirement, use null. Do not fill in typical values.
2. Every non-null requirement field MUST have an evidence entry whose "quote" is copied character-for-character from the input text, including its original wording. Never paraphrase a quote. Never merge two sentences.
3. If a requirement is vague or ambiguous, set the field to null AND add a note to uncertainFields describing what is unclear.
4. GPA: only fill minGpa when the text gives a number on a 4.0 scale. Any other scale (5.0, 100-point, UK classifications) goes to otherConditions as text and minGpa stays null. A requirement written as "3.5/5.0" or "85%" is NOT a 4.0-scale minimum.
5. English: only fill englishTest and minEnglishScore when an exact test and score are named. "Good English" is not a requirement.
6. deadline must be a real calendar date. If only "mid-November" is given, use null and add a note.
7. tags: 3-6 lowercase topical keywords describing the field or skill area, not the eligibility.
8. requiredDocuments: short noun phrases, e.g. "CV", "Personal statement", "Transcript".
9. uncertainFields is never empty if any of minGpa, minYear, deadline is null.
10. Your entire output must be valid JSON parseable by JSON.parse.
`;

class ModelResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ModelResponseError";
  }
}

export async function extractOpportunity(rawText: string): Promise<unknown> {
  const apiKey = process.env.LLM_API_KEY;
  if (!apiKey) {
    throw new Error("LLM_API_KEY is required.");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: process.env.LLM_BASE_URL ?? "https://api.deepseek.com",
  });
  const response = await client.chat.completions.create(
    {
      model: process.env.LLM_MODEL ?? "deepseek-chat",
      messages: [
        { role: "system", content: EXTRACTION_SYSTEM_PROMPT },
        { role: "user", content: rawText },
      ],
      response_format: { type: "json_object" },
      temperature: 0,
    },
    { signal: AbortSignal.timeout(25_000) },
  );
  const content = response.choices[0]?.message?.content;

  if (typeof content !== "string" || content.length === 0) {
    throw new ModelResponseError("The model returned no JSON content.");
  }

  try {
    return JSON.parse(content) as unknown;
  } catch {
    throw new ModelResponseError("The model returned invalid JSON.");
  }
}

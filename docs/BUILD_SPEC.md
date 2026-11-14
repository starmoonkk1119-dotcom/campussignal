# CampusSignal — Build Spec for Codex

> **给 starmoon 的说明（中文，Codex 可忽略本节）**
> 这是喂给 Codex 的施工规格，按 SLICE 1 → 2 → 3 → 4 顺序逐段交付，每段跑通验收标准再进入下一段。
> 不要一次性把整份文件丢给 Codex 让它"做完整个 app"。每次只贴一个 SLICE 的章节 + 第 0 节和第 13 节的禁止事项。
> 第 6 节含 API 契约与限流，第 14 节是真密钥的处理规则——**`.env.local` 由你自己填，不要让 Codex 生成，也不要贴给任何人**。

---

## 0. Ground rules for the agent

You are implementing a hackathon MVP. Read all of this before writing code.

**Project**: CampusSignal — students paste an opportunity announcement (competition, internship, scholarship, exchange), the app extracts structured eligibility requirements, compares them against the student's profile, returns one of three eligibility states with the exact source sentence as evidence, and generates an application task plan.

**Hard constraints**

- Stack is fixed: Next.js (App Router) + TypeScript (strict) + Tailwind CSS. Deploy target is Vercel.
- No authentication. No database. No server-side persistence. State lives in `localStorage`, seeded on first load.
- The rule engine is pure TypeScript with zero network calls and zero LLM involvement. It must be unit-testable and produce identical output for identical input.
- Only one server route calls an LLM: `POST /api/parse`. Everything else is client-side.
- Do not add features, pages, fields, or dependencies that are not in this spec. If something seems missing, leave a `// TODO(spec-missing):` comment and continue — do not invent.
- UI copy is in English. Code, comments, and identifiers in English. No emoji anywhere, including in UI text and commit messages.
- Deliver in the four slices described in section 12. Stop at the end of each slice and wait for review.

**The three things the demo must prove** (everything else is decoration)

1. A pasted announcement becomes structured fields, and every extracted field shows the sentence it came from.
2. A student who is not eligible is told they are not eligible — even if their match score is high. The system never lets a score override a hard requirement.
3. When a requirement is missing from the announcement, the system says "needs verification" instead of guessing.

---

## 1. Repository layout

```
app/
  layout.tsx
  page.tsx                    # Dashboard
  discover/page.tsx           # Scanner: paste + parse
  opportunities/[id]/page.tsx # Opportunity detail
  profile/page.tsx            # My Profile
  planner/page.tsx            # Application Planner
  api/parse/route.ts          # ONLY server route that calls the LLM
components/
  OpportunityCard.tsx
  EligibilityBadge.tsx
  EvidenceQuote.tsx           # highlights the source sentence inside raw text
  ScoreBreakdown.tsx
  TaskItem.tsx
  charts/CategoryChart.tsx
  charts/StatusChart.tsx
lib/
  types.ts
  store.ts                    # localStorage load/save + seed bootstrap
  seed.ts                     # demo data
  fixtures.ts                 # canned /api/parse response for DEMO_MODE
  rules.ts                    # PURE eligibility + scoring functions
  tasks.ts                    # PURE planner generation
  llm.ts                      # provider adapter (server-only)
  parseSchema.ts              # zod schema shared by route + client validation
  evidence.ts                 # normalizeForMatch + quoteAppearsIn (pure)
  format.ts                   # fixed YYYY-MM-DD formatter
  storageKeys.ts
test/
  rules.test.ts
  tasks.test.ts
  evidence.test.ts
.env.example
README.md
```

Dependencies: `next`, `react`, `typescript`, `tailwindcss`, `zod`, `recharts`, `vitest`, `openai`.
Nothing else without asking.

---

## 2. Data model (`lib/types.ts`)

Write these types exactly. Field names are used by the API contract and the seed data, so do not rename them.

```ts
export type OpportunityCategory =
  | "competition"
  | "internship"
  | "scholarship"
  | "exchange"
  | "research"
  | "summer_school";

export type EligibilityStatus = "ELIGIBLE" | "NOT_ELIGIBLE" | "NEEDS_VERIFICATION";

export type EnglishTest = "IELTS" | "TOEFL";

export interface EligibilityCriteria {
  minYear: number | null;        // 1-4, undergraduate year of study
  maxYear: number | null;
  minGpa: number | null;         // on a 4.0 scale ONLY
  englishTest: EnglishTest | null;
  minEnglishScore: number | null;
  majorRequirement: string | null;   // free text, advisory only, never a hard fail
  otherConditions: string[];         // free text, shown to the user as-is
}

export interface EvidenceEntry {
  field: string;   // dot path, e.g. "eligibility.minGpa"
  quote: string;   // EXACT substring of Opportunity.rawText
}

export interface Opportunity {
  id: string;
  title: string;
  category: OpportunityCategory;
  organizer: string | null;
  summary: string | null;
  sourceUrl: string | null;
  deadline: string | null;            // ISO date, "YYYY-MM-DD", null if not stated
  rawText: string;
  eligibility: EligibilityCriteria;
  requiredDocuments: string[];
  tags: string[];                     // lowercase keywords for relevance matching
  uncertainFields: string[];          // human-readable notes, e.g. "GPA requirement not stated"
  evidence: EvidenceEntry[];
  createdAt: string;                  // ISO datetime
}

export interface UserProfile {
  name: string;
  studyYear: number;                  // 1-4
  major: string;
  gpa: number;                        // 4.0 scale
  gpaScale: "4.0";                    // v1 supports only this value
  englishTest: EnglishTest | null;
  englishScore: number | null;
  skills: string[];
  interests: string[];                // free text keywords, lowercased on save
  weeklyHours: number;                // hours per week the student can commit
}

export interface MatchResult {
  status: EligibilityStatus;
  score: number;                      // 0-100, ordering only, never a probability
  breakdown: { G: number; Y: number; R: number; T: number };
  reasons: string[];                  // plain-English explanations, max 4
  blockers: string[];                 // hard-fail explanations, empty unless NOT_ELIGIBLE
  verificationNotes: string[];        // what is missing or ambiguous
}

export type TaskPriority = "high" | "medium" | "low";

export interface ApplicationTask {
  id: string;
  opportunityId: string;
  name: string;
  dueDate: string;      // ISO date
  status: "todo" | "done";
  priority: TaskPriority;
  isCustom: boolean;
}

export interface AppState {
  profile: UserProfile | null;
  opportunities: Opportunity[];
  tasks: ApplicationTask[];
}
```

---

## 3. Rule engine (`lib/rules.ts`)

Pure functions, no imports from React or `next`. Export exactly two:

```ts
export function evaluateEligibility(opp: Opportunity, profile: UserProfile, today: Date): MatchResult
export function scoreOpportunity(opp: Opportunity, profile: UserProfile, today: Date): { score: number; breakdown: MatchResult["breakdown"] }
```

`evaluateEligibility` must call `scoreOpportunity` internally so the scoring formula exists in exactly one place. `scoreOpportunity` never reads eligibility status and never consults `blockers`.

### 3.1 Hard-fail checks → `NOT_ELIGIBLE`

These produce a blocker string. Any blocker forces `status = "NOT_ELIGIBLE"` and sets `score = 0`.

| Condition | Blocker message |
| --- | --- |
| `minYear !== null && profile.studyYear < minYear` | `Requires year {minYear} or above; you are year {profile.studyYear}.` |
| `maxYear !== null && profile.studyYear > maxYear` | `Open to year {maxYear} and below only.` |
| `minGpa !== null && profile.gpa < minGpa` | `Requires GPA {minGpa}; yours is {profile.gpa}.` |
| `englishTest && minEnglishScore && profile.englishTest === englishTest && profile.englishScore < minEnglishScore` | `Requires {test} {score}; yours is {yours}.` |
| `deadline !== null && deadline is before today` | `Deadline has passed.` |

`majorRequirement` and `otherConditions` never hard-fail. They may contribute to relevance and are always shown as text.

### 3.2 Verification triggers → `NEEDS_VERIFICATION`

Raised when the information needed for a decision is absent, on either side. Each adds a note; if any note exists and there is no blocker, `status = "NEEDS_VERIFICATION"`.

| Condition | Note |
| --- | --- |
| `minGpa === null` | `GPA requirement is not stated in the announcement.` |
| `minYear === null && maxYear === null` | `No year-of-study requirement is stated.` |
| `englishTest !== null && minEnglishScore !== null && profile.englishTest === null` | `Requires {test} {score}; you have not added a test score.` |
| `englishTest !== null && minEnglishScore !== null && profile.englishTest !== englishTest` | `Requires {test}; your profile lists {profileTest}. Scores are not converted.` |
| `profile.gpaScale !== "4.0"` | `GPA is compared on a 4.0 scale only.` |
| `deadline === null` | `Deadline is not stated in the announcement.` |
| `uncertainFields.length > 0` | one note per entry, copied verbatim |

Do not compare GPA across scales. Do not convert IELTS to TOEFL or vice versa. Saying "needs verification" is the correct answer here. Dedupe `verificationNotes` before returning — the same string must not appear twice.

### 3.3 Scoring (ordering only)

Computed regardless of status, but displayed as 0 when `NOT_ELIGIBLE`.

```
G (academic fit)   minGpa === null                      -> 0.6
                   gpa >= minGpa                        -> 1.0
                   else                                  -> max(0, 1 - (minGpa - gpa) / 0.5)

Y (year fit)       both null                           -> 0.7
                   within range                        -> 1.0
                   outside range                       -> 0.0

R (relevance)      terms = lowercase(profile.skills ++ profile.interests ++ [profile.major])
                   hits  = tags filtered to those contained in any term, or any term contained in them
                   R     = clamp(hits.length / min(3, max(1, tags.length)), 0, 1)
                   tags empty                          -> 0.5

T (time readiness) deadline === null                    -> 0.5
                   days < 0                             -> 0.0
                   days < 3                             -> 0.2
                   days < 7                             -> 0.5
                   days < 21                            -> 0.8
                   else                                 -> 1.0
```

`score = round(100 * (0.35*G + 0.30*Y + 0.20*R + 0.15*T))`, where `days` is whole days from `today` (date-only, midnight local) to `deadline`.

### 3.4 Reasons

Build up to four short sentences from the breakdown, for example `Strong academic fit.`, `Matches your skills in data analysis.`, `Deadline is in 6 days, start now.` Reasons must never contradict a blocker.

### 3.5 Required test cases (`test/rules.test.ts`)

Write all of these; they are the acceptance criteria for slice 1.

1. Year 2 student vs `minYear: 3` → `NOT_ELIGIBLE`, `score === 0`, one blocker.
2. Same student as above but GPA 3.9 and 5 matching tags → still `NOT_ELIGIBLE`, still `score === 0`.
3. GPA 3.2 vs `minGpa: 3.5` → `NOT_ELIGIBLE`, blocker mentions both numbers.
4. `minGpa: null` and everything else satisfied → `NEEDS_VERIFICATION`, note about GPA.
5. Fully specified and satisfied → `ELIGIBLE`, no notes, no blockers.
6. `englishTest: "TOEFL"` required, profile has IELTS → `NEEDS_VERIFICATION`, note says no conversion.
7. `deadline` 2 days out → `T === 0.2`.
8. Deadline in the past → `T === 0` and status is `NOT_ELIGIBLE` with blocker `Deadline has passed.`
9. Determinism: same inputs twice → deep-equal results.

---

## 4. Planner (`lib/tasks.ts`)

```ts
export function generateTasks(opp: Opportunity, profile: UserProfile, today: Date): ApplicationTask[]
```

Input is the opportunity and profile; output is a fresh task list. Algorithm, in order:

1. Base checklist, each mapped to a priority and a day offset from the deadline:

| Task name | Priority | Offset (days before deadline) |
| --- | --- | --- |
| `Confirm eligibility requirements` | high | 10 |
| `Prepare {document}` — one per `requiredDocuments` entry | medium (high if the name contains "personal statement", "essay", or "proposal") | spread evenly across 9 ... 3 |
| `Ask a referee for a recommendation letter` | high | 10 — only if a document name contains "recommend" |
| `Final review and submit` | high | 2 |

2. Let `available = whole days from today to deadline` (after step 5 substitution). If `available < 10`, scale every offset: `scaled = Math.floor(offset * available / 10)`.
3. `dueDate = deadline - scaled` days. Any result before `today` is clamped to `today`; ties keep the offset order (larger offset first).
4. Sort ascending by `dueDate`, then by priority (`high` before `medium` before `low`).
5. If `deadline === null`, use `today + 14` as a provisional deadline and prepend `Deadline unknown — dates are provisional. ` to the first task name.
6. If `weeklyHours < 5`, insert `Reserve a focused work block this week` at priority high, dated `today + 2`.

Test cases: tasks sorted ascending; all dates between `today` and `deadline` inclusive; a deadline 5 days out produces a monotonic plan that compresses rather than collapsing to a single date when there are 5+ tasks; document count equals `requiredDocuments.length`; unknown deadline yields provisional dates; `weeklyHours: 4` inserts the work-block task.

---

## 5. Evidence validation (`test/evidence.test.ts`)

Extracted quotes must be verifiable against the source. Implement:

```ts
export function normalizeForMatch(s: string): string   // collapse whitespace, strip smart quotes, lowercase
export function quoteAppearsIn(quote: string, rawText: string): boolean
```

`quoteAppearsIn` must be true only if the normalized quote is a normalized substring of the raw text. In `POST /api/parse`, drop any evidence entry failing this check and add a corresponding `uncertainFields` note. The UI must never render an evidence quote that does not appear in the pasted text — this is the anti-hallucination guarantee, and it is the single most important correctness property in the app.

---

## 6. API contract — `POST /api/parse`

Request:

```json
{ "rawText": "string, 40..20000 chars", "sourceUrl": "string | null" }
```

Response `200`:

```json
{
  "ok": true,
  "source": "model" | "fallback",
  "opportunity": { "...Opportunity minus id/createdAt..." },
  "warnings": ["string"]
}
```

Response `422` for schema failures after one retry, `429` for rate limit, `503` when the model is unreachable and no fallback applies. Error body: `{ "ok": false, "error": "string", "code": "BAD_INPUT" | "MODEL_ERROR" | "RATE_LIMITED" }`.

Implementation requirements:

1. Validate the request with zod. Reject `rawText` under 40 characters with `BAD_INPUT`.
2. Call the model through `lib/llm.ts` with JSON mode, `temperature: 0`, 25-second timeout, one retry on schema-invalid output.
3. Validate the model's JSON with `parseSchema.ts`. On a second failure return `422` with `MODEL_ERROR` — never return partially-parsed data.
4. Post-process: strip evidence entries that fail `quoteAppearsIn`, drop ids, coerce `deadline` to `YYYY-MM-DD` or `null`, lowercase `tags`, dedupe `requiredDocuments`.
5. Simple in-memory rate limit: 10 requests per IP per 10 minutes, keyed on `x-forwarded-for`. Return `429` beyond that. Document in the README that this is per-instance and not durable.
6. `DEMO_MODE=true` short-circuits before the model call and returns the response from `lib/fixtures.ts` with `"source": "fallback"`. This is what runs during judging.
7. Never log `rawText` or the API key. Log only `{ ok, source, durationMs }`.

---

## 7. Provider adapter (`lib/llm.ts`)

Server-only. Import `openai` and construct the client from environment variables:

- `LLM_BASE_URL` default `https://api.deepseek.com`
- `LLM_MODEL` default `deepseek-chat`
- `LLM_API_KEY` — required, throws at call time if missing

Export one function:

```ts
export async function extractOpportunity(rawText: string): Promise<unknown>  // returns parsed JSON, throws on transport error
```

Use `response_format: { type: "json_object" }` and pass the system prompt from section 8 verbatim. Any OpenAI-compatible endpoint (DeepSeek, Qwen/DashScope compatible mode, GLM) must work by changing only those three environment variables — no code change. Do not add provider-specific branches.

`.env.example` must contain exactly:

```
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
LLM_API_KEY=
DEMO_MODE=false
```

`DEMO_MODE` is read server-side only. No variable may be prefixed `NEXT_PUBLIC_`.

---

## 8. Extraction prompt (verbatim)

System prompt:

```
You extract structured eligibility data from university opportunity announcements.

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
```

User message: the raw announcement text, passed unchanged.

Keep this prompt in `lib/llm.ts` as a top-level constant named `EXTRACTION_SYSTEM_PROMPT`. Do not edit its wording without asking.

---

## 9. Storage (`lib/store.ts`)

- `loadState(): AppState` — read `localStorage["campussignal.v1"]`; if absent or unparseable, return `seedState()` and write it.
- `saveState(state: AppState): void` — write JSON.
- A React context `AppProvider` exposing `state`, `setProfile`, `addOpportunity`, `toggleTask`, `updateTaskDate`, `resetDemo`. Every mutation calls `saveState`.
- All `localStorage` access must happen inside `useEffect` / event handlers, never during render, to avoid hydration mismatch. Render the seed data on the server pass.
- Seed deadlines are computed once at module load from a single `new Date()` truncated to midnight local, then offset by whole days. Do not call `Date.now()` or `new Date()` inside a component body, and do not format dates with locale-dependent helpers (`toLocaleDateString`) during render — those are the two usual causes of hydration warnings. Use a fixed `YYYY-MM-DD` → `en-GB` formatter in `lib/format.ts`.
- On first client mount, `AppProvider` compares `localStorage` against the server-rendered seed; if the stored payload exists it replaces state inside `useEffect` only.
- A visible `Reset demo data` control in the header.

---

## 10. Pages

**Dashboard (`/`)** — four metric cards: total opportunities, eligible count, needs-verification count, tasks due in 7 days. Below: "What should I apply for next?" listing the top three non-eligible-excluded opportunities sorted by score, each with a one-line reason and its eligibility badge. Then a nearest-deadlines list. Each card links to the detail page.

**Discover (`/discover`)** — textarea, optional source URL, `Analyze` button, loading state, error state that says exactly what went wrong. On success, navigate to the detail page for the new opportunity in "review" mode where every extracted field is editable and shows its evidence quote beneath it.

**Opportunity detail (`/opportunities/[id]`)** — title, category, organizer, deadline, eligibility table (requirement vs your profile vs verdict), evidence panel, score breakdown, and the decided state (`ELIGIBLE` / `NOT_ELIGIBLE` / `NEEDS_VERIFICATION`) as a badge in the header. Then "Plan my application" which generates tasks and links to the planner.

**My Profile (`/profile`)** — one form, all fields from `UserProfile`, inline validation (`gpa` 0-4, `studyYear` 1-4, scores positive). Saving immediately recomputes every match result on screen.

**Planner (`/planner`)** — grouped by opportunity, tasks sorted by date, checkboxes persisted, edit-due-date, overdue tasks in red. Above the list, total hours estimate computed as `tasks.length * 1.5` rounded.

---

## 11. Seed data (`lib/seed.ts`)

One profile: year 2, Business Analytics major, GPA 3.4, IELTS 7.0, skills `["python", "sql", "data analysis", "case competition"]`, interests `["consulting", "fintech"]`, 8 hours/week.

Four opportunities, deliberately covering the three states so the dashboard tells the story at a glance:

1. **ELIGIBLE** — a business case competition, `minYear: 1`, `minGpa: 3.0`, IELTS 6.5, deadline 12 days out, documents `["CV", "Application form"]`. Everything the rule engine needs is stated, so the verdict is a clean `ELIGIBLE`.
2. **NOT_ELIGIBLE** — a consulting internship, `minYear: 3`, `minGpa: 3.2`, IELTS 6.5, deadline 20 days out, tags deliberately overlapping the profile (`["consulting", "data analysis", "case"]`) so the score would be high if it were computed. This one exists to prove the score never overrides a hard requirement.
3. **NEEDS_VERIFICATION** — a research assistantship with `minGpa: null`, `minYear: null`, `maxYear: null`, `uncertainFields: ["GPA requirement not stated", "Deadline described only as late November"]`, `deadline: null`. It must produce at least three verification notes, not zero.
4. **ELIGIBLE, urgent** — a scholarship 4 days out with `minYear: 1`, `minGpa: 3.0`, documents `["Personal statement", "Recommendation letter", "Transcript"]`, so the planner generates a visible crunch with compressed dates.

Every `rawText` must be 400+ characters of realistic English announcement prose containing, verbatim, each quote listed in that opportunity's `evidence` array. Write them as plausible university bulletins. `deadline` values are relative to a fixed reference date so the seed stays sensible; compute them from `new Date()` at seed time and document that choice in a comment.

Label the dashboard header with a small line: `Demo data — sample opportunities for illustration.` This is required by the project's own risk table and by fair-play rules about not passing fabricated data off as real.

---

## 12. Delivery slices

**SLICE 1 — skeleton + rules, no AI.** Repo scaffold, types, `lib/rules.ts`, `lib/tasks.ts`, seed data, tests for sections 3 and 4, plus a read-only Dashboard and detail page rendering seed data. Acceptance: `npm run test` green; dashboard shows 4 opportunities and the correct badge on each; the NOT_ELIGIBLE card shows score 0 and a blocker sentence even though its tags match well. No network calls exist yet.

**SLICE 2 — parsing.** `/api/parse` route, `lib/llm.ts`, zod schema, evidence stripping, rate limit, `DEMO_MODE` fixtures, the Discover page, and the editable review UI. Acceptance: pasting a real announcement returns structured fields; a request with `DEMO_MODE=true` returns the fixture with `source: "fallback"`; an announcement with no GPA sentence yields `minGpa: null` and a `NEEDS_VERIFICATION` outcome, not a guess; the key never appears in any client bundle or network response.

**SLICE 3 — evidence UI + matching surface.** `EvidenceQuote` highlighting the quote inside the collapsed raw text, the requirement-vs-profile table, score breakdown with the four components, and "What should I apply for next?" on the dashboard. Acceptance: clicking a field scrolls to and highlights its source sentence; a field whose quote was stripped shows a "no supporting quote" marker instead of a fake citation.

**SLICE 4 — planner + charts + polish.** Task generation wired to the UI, checkboxes persisting, overdue styling, two Recharts charts (category distribution, eligibility distribution), empty states, error states, `Reset demo data`, README with architecture notes, the AI-tools disclosure paragraph, and a `Known limitations` section. Acceptance: `npm run build` clean under `strict`; a fresh incognito visit shows populated demo data; every page renders without console errors.

---

## 13. Do not

- Do not add auth, login, signup, Supabase, Prisma, any database, or any server-side persistence.
- Do not call the LLM from a client component, a Server Component render, or anywhere except `POST /api/parse`.
- Do not put scoring arithmetic, eligibility comparison, or date logic inside the LLM prompt or parse the model's prose to make decisions. The model extracts fields; TypeScript decides.
- Do not create, read, or write `.env.local`. Only `.env.example` with empty values.
- Do not use `NEXT_PUBLIC_` for anything secret.
- Do not install UI kits, component libraries, state managers, or animation libraries.
- Do not use purple-to-blue gradients, glowing cards, glassmorphism, or chat-bubble UI. Visual direction: dark navy (`#0F1D33`) primary, slate greys, white cards, one accent color for the three states (green / red / amber), generous whitespace, clear type hierarchy. This should read as a trustworthy SaaS tool, not an AI product.
- Do not fabricate evidence quotes to fill a panel. Missing evidence renders as missing.
- Do not exceed the four slices in one pass.

---

## 14. Secrets

`LLM_API_KEY` is set by the human owner in `.env.local` locally and in the Vercel project settings for deployment. It is never committed, never echoed in logs, never sent to the browser, and never included in a prompt. The agent must not ask for it and must not attempt to read it.

---

## 15. Time budget

Assume roughly 12 productive hours remain. Slice 1: 2h. Slice 2: 3h. Slice 3: 2.5h. Slice 4: 3h. Reserve the final 1.5h for build verification and the video recording, which is a hard submission requirement and outranks any remaining feature.

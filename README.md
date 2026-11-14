# CampusSignal

CampusSignal helps university students decide whether they qualify for competitions, internships, scholarships, exchanges, research roles, and summer schools. A student pastes an announcement, reviews the extracted requirements and source evidence, compares the opportunity with their profile, and gets a clear eligibility verdict plus an application plan.

## The problem

Students receive opportunity announcements scattered across emails, PDFs, and websites. The hard part is not finding them; it is deciding whether they qualify and what to do next.

## How it works

The app deliberately splits language understanding from decision-making. The language model only turns announcement prose into structured fields. Every eligibility decision, every score, and every application date is computed in `lib/rules.ts` and `lib/tasks.ts` with no network access.

This separation matters because a match score must never override a failed hard requirement. Missing information must produce **Needs verification** rather than a guess.

```text
  pasted announcement
        |
        v
  POST /api/parse  ------------------------------------------------+
        |                                                          |
        |   [ NETWORK BOUNDARY: the only place a model is called ] |
        v                                                          |
  LLM extraction (DeepSeek, OpenAI-compatible)  <-------------------+
        |
        v
  zod schema validation  -->  evidence substring check
        |                           (quotes that fail are dropped
        |                            and the field is flagged)
        v
  browser localStorage
        |
        v
  ============ NO NETWORK BEYOND THIS POINT ============
        |
        v
  TypeScript rule engine  (lib/rules.ts)
        |
        +--> verdict: Eligible / Not eligible / Needs verification
        |
        +--> TypeScript planner  (lib/tasks.ts)  --> dated task list
```

The rule engine and planner sit outside the network boundary. They are pure TypeScript functions and can be tested without React, Next.js, or an LLM.

## Evidence and anti-hallucination

Every extracted field carries a verbatim quote from the source announcement. Quotes that fail a normalized-substring check are discarded and the field is flagged. This guarantee is enforced in code by `lib/evidence.ts` and `lib/highlight.ts`, with tests, rather than by asking the model nicely.

The highlight range is computed by mapping normalized text back onto offsets in the original announcement. This allows the UI to tolerate case changes, smart quotes, and collapsed whitespace while still highlighting only a verified source span.

## Three eligibility states

- **Eligible** — all stated hard requirements are met and no required information is missing.
- **Not eligible** — at least one hard requirement fails, such as year, GPA, English score, or a passed deadline. The score is forced to zero.
- **Needs verification** — no hard requirement has failed, but the announcement or profile is missing information needed for a confident decision.

## Built with

- Next.js App Router and TypeScript in strict mode
- Tailwind CSS
- Recharts
- zod
- OpenAI SDK pointed at DeepSeek through an OpenAI-compatible adapter
- Vercel deployment target

## How this was built

The application was written during the hackathon with AI assistance, and it is disclosed here in full.

- **OpenAI Codex** generated the first draft of each module, working from a written specification in `docs/BUILD_SPEC.md`.
- **Claude (Anthropic)** reviewed every module, wrote the specification, and fixed the defects found in review. Those fixes are visible in the code and covered by tests.
- The model provider used at runtime is **DeepSeek**, through an OpenAI-compatible adapter. No student data is sent to any model — only the announcement text a user pastes.

Reviewing the generated code mattered more than generating it. The defects that were caught and fixed included: reasons that praised academic fit on an opportunity the student was blocked from; a planner that could schedule work after the deadline; a verification note that rendered as "your profile lists null"; a null GPA requirement carrying a fabricated quote; the model returning bare field names instead of canonical paths; and a rate limiter that throttled the free demo path as if it were a paid model call.

## Running locally

The server-side environment variables are:

```text
LLM_BASE_URL=https://api.deepseek.com
LLM_MODEL=deepseek-chat
LLM_API_KEY=
DEMO_MODE=false
```

Install dependencies, start the development server, and run the tests:

```bash
npm install
npm run dev
npm run test
```

Set `DEMO_MODE=true` to return a canned structured response without calling any model. This is how the public demo runs.

## Testing

```bash
npm run test
```

The test suite covers the rule engine, planner, evidence verification, field normalization, and highlight offset mapping. Interactive React behavior is verified by hand.

## Known limitations

- GPA comparison supports only the 4.0 scale.
- IELTS and TOEFL scores are never converted.
- Data lives in browser `localStorage` per device.
- The rate limiter is in-memory and resets on redeploy.
- PDF and image announcements are not supported.
- The model can still misread an unusual announcement, which is why every field is editable before saving.

## What's next

- Multi-source ingestion with permission
- Deadline change detection
- Shared verified lists for student societies
- Application material checklists

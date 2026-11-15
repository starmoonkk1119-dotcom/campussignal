# Devpost submission — CampusSignal

Paste each block into the matching field. Voice is first person singular, since this was a solo build.

---

## Inspiration

Every semester I get opportunity announcements from three directions at once: department emails, a student society group chat, and whatever competition page someone links. The announcements are long, the requirements are buried in paragraph four, and the deadline is usually mentioned once.

The part that actually costs me something is not discovery. It is the ten minutes I spend re-reading a notice trying to work out whether I am even allowed to apply — and the fact that I sometimes decide against applying for something I was qualified for, because I misread a GPA line.

The tools I tried did not help with that. They either list opportunities, or they are a chat window that will confidently tell you "this looks like a great fit" whether or not you meet the entry requirement. Neither one tells you what you actually need to know: can I apply, and what should I do this week.

## What it does

CampusSignal takes an announcement — pasted text — and turns it into three things.

First, structured requirements. A model extracts the year, GPA, English test, documents and deadline. Every extracted field carries the exact sentence it came from, and that sentence is clickable: it highlights the source span inside the original announcement.

Second, a verdict. Not a score — a verdict. The student's profile is compared against the requirements and the result is one of three states: **Eligible**, **Not eligible**, or **Needs verification**. A hard requirement failing forces the score to zero, and the interface explains why. If the announcement does not state a GPA requirement, the answer is "not stated" rather than an assumed 3.0.

Third, an application plan. The required documents and the deadline become a dated checklist, compressed when the deadline is close, and never scheduled after the deadline itself.

There is also a profile page where changing your GPA recomputes every verdict on screen immediately — which is the clearest demonstration that the decisions are computed, not generated.

## How I built it

Next.js App Router with TypeScript in strict mode, Tailwind for styling, Recharts for two dashboard charts, zod for validation, deployed on Vercel.

The runtime model is **DeepSeek**, reached through an OpenAI-compatible adapter, so switching providers is two environment variables rather than a rewrite.

The most important design decision was splitting the app into two halves with a hard boundary between them.

The language model only converts prose into fields. It never decides anything. Every eligibility comparison, every score component, every date calculation runs in pure TypeScript — `lib/rules.ts` and `lib/tasks.ts` — with no network access at all. Those files are unit tested, deterministic, and cannot hallucinate.

That split exists because of a failure mode I kept seeing in other tools: a similarity score quietly overriding a hard requirement. A student who matches every keyword of an internship but is one year too junior gets a warm "great match" and wastes an evening on an application that will be rejected automatically. In CampusSignal the score exists only to order opportunities, and any failed hard requirement sets it to zero.

The second decision was treating evidence as a data structure rather than a prompt instruction. I do not ask the model to be careful about quotes. I check them. Every evidence entry must be a normalized substring of the pasted text, verified in code — `lib/evidence.ts`. Anything that fails is dropped and the field is flagged as unsupported. To highlight the source span I map the normalized text back onto offsets in the original string, so a quote still highlights correctly when the model changes case or collapses a run of whitespace — `lib/highlight.ts`, with tests for exactly those cases.

## Challenges

**AI-generated code that looks right and is subtly wrong.** I used Codex to draft each module from a written specification, then reviewed every module by running it against edge cases rather than reading it. That review caught things that would have shipped silently.

The one I keep coming back to: the rule engine correctly returned "Not eligible" for a year-3 internship, set the score to zero, and produced a blocker sentence — and then, in the reasons array rendered above it, wrote "Strong academic fit." The student was blocked and the first line of the card praised their academic fit, because the reason generator could not see the blockers. That is the exact failure the whole app is built to prevent, produced by my own code.

Others in the same category: the planner scheduled a work-block task two days out even when the deadline was tomorrow; a verification note rendered literally as "your profile lists null"; the model returned bare field names (`minYear`) instead of the canonical paths the UI expects, which quietly bypassed a safeguard I had written; and the rate limiter throttled the free demo path as if it were a paid model call — the one path judges would touch.

None of these appeared in the happy path. All of them came from asking "what if two conditions are true at once" and "what does this look like when the input is empty".

**GPA is not one number.** Comparing a 3.2 to a 3.5 is trivial. Comparing a 4.0-scale GPA to a 5.0-scale or a percentage is not, and pretending otherwise would produce confident wrong answers. The honest solution was scope: v1 supports the 4.0 scale only and says so, and never converts IELTS to TOEFL. Being visibly narrow beats being silently wrong.

**Time.** Built solo in one night, which forced a ruthless ordering: the rule engine and its tests first, the UI last. Anything not on the critical demo path — PDF parsing, automatic scraping — was cut and documented as future work.

## What I learned

That the interesting problem in an AI product is not getting the model to produce output. It is designing what happens when the model is wrong, incomplete, or overconfident.

Three things I would carry into any similar project. First, put the model on the smallest possible surface: extraction only, with decision logic in deterministic code you can test. Second, make uncertainty a first-class state — "needs verification" is a better product than a confident guess, and it is the state that builds trust. Third, review generated code by executing it against adversarial inputs, not by reading it; the bugs above all read fine.

I also learned that the split between model and engine is what makes the whole thing honest. It is easy to say a tool does not hallucinate. It is much better to be able to open a file and show that the decision was never in the model's hands.

## What's next

The narrow scope is deliberate and the next steps follow from it.

Multi-source ingestion, with permission — the manual paste step is the biggest friction, and it is what a real deployment would fix first. Deadline change detection, so a student is told when an announcement they saved has been amended. Shared verified lists for student societies, so a group can maintain one trusted set of opportunities instead of forwarding screenshots. Material checklists that go beyond the task list into the actual documents.

The long-term version is not a replacement for official channels. It sits on top of them and answers the question they do not: does this apply to me, and what do I do next.

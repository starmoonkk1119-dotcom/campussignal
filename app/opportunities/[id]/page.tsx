"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";

import EligibilityBadge from "@/components/EligibilityBadge";
import EvidenceQuote from "@/components/EvidenceQuote";
import ScoreBreakdown from "@/components/ScoreBreakdown";
import { evaluateEligibility } from "@/lib/rules";
import { useApp } from "@/lib/store";
import { generateTasks } from "@/lib/tasks";
import type { MatchResult } from "@/lib/types";

const TODAY = new Date();

type Verdict = "Meets" | "Does not meet" | "Not stated";

type RequirementRow = {
  key: string;
  requirement: string;
  stated: string;
  profileValue: string;
  sourceField: string;
};

function formatDeadline(deadline: string | null): string {
  if (deadline === null) {
    return "Deadline not stated";
  }

  const [year, month, day] = deadline.split("-");
  return `${day}/${month}/${year}`;
}

function formatCategory(category: string): string {
  return category.replace("_", " ");
}

function formatYearRequirement(
  minYear: number | null,
  maxYear: number | null,
): string {
  if (minYear === null && maxYear === null) {
    return "Not stated";
  }
  if (minYear !== null && maxYear !== null) {
    return `Years ${minYear}-${maxYear}`;
  }
  if (minYear !== null) {
    return `Year ${minYear} or above`;
  }
  return `Year ${maxYear} or below`;
}

function formatEnglishRequirement(
  englishTest: "IELTS" | "TOEFL" | null,
  minEnglishScore: number | null,
): string {
  if (englishTest === null || minEnglishScore === null) {
    return "Not stated";
  }
  return `${englishTest} ${minEnglishScore}`;
}

function formatProfileEnglish(
  englishTest: "IELTS" | "TOEFL" | null,
  englishScore: number | null,
): string {
  if (englishTest === null || englishScore === null) {
    return "No test score added";
  }
  return `${englishTest} ${englishScore}`;
}

function blockerMatches(result: MatchResult, matcher: (blocker: string) => boolean) {
  return result.blockers.some(matcher);
}

function verificationMatches(
  result: MatchResult,
  matcher: (note: string) => boolean,
) {
  return result.verificationNotes.some(matcher);
}

function requirementVerdict(
  row: RequirementRow,
  opportunity: {
    eligibility: {
      minYear: number | null;
      maxYear: number | null;
      minGpa: number | null;
      englishTest: "IELTS" | "TOEFL" | null;
      minEnglishScore: number | null;
      majorRequirement: string | null;
      otherConditions: string[];
    };
  },
  result: MatchResult,
): Verdict {
  if (row.key === "year") {
    if (
      blockerMatches(
        result,
        (blocker) =>
          blocker.startsWith("Requires year") ||
          blocker.startsWith("Open to year"),
      )
    ) {
      return "Does not meet";
    }
    if (
      opportunity.eligibility.minYear === null &&
      opportunity.eligibility.maxYear === null
    ) {
      return "Not stated";
    }
    if (
      verificationMatches(result, (note) =>
        note.toLowerCase().includes("year-of-study"),
      )
    ) {
      return "Not stated";
    }
    return "Meets";
  }

  if (row.key === "gpa") {
    if (blockerMatches(result, (blocker) => blocker.startsWith("Requires GPA"))) {
      return "Does not meet";
    }
    if (
      opportunity.eligibility.minGpa === null ||
      verificationMatches(result, (note) => note.toLowerCase().includes("gpa"))
    ) {
      return "Not stated";
    }
    return "Meets";
  }

  if (row.key === "english") {
    if (
      blockerMatches(
        result,
        (blocker) =>
          blocker.startsWith("Requires IELTS") ||
          blocker.startsWith("Requires TOEFL"),
      )
    ) {
      return "Does not meet";
    }
    if (
      opportunity.eligibility.englishTest === null ||
      opportunity.eligibility.minEnglishScore === null ||
      verificationMatches(result, (note) => {
        const lowerNote = note.toLowerCase();
        return (
          lowerNote.includes("scores are not converted") ||
          lowerNote.includes("test score") ||
          lowerNote.includes("requires ielts") ||
          lowerNote.includes("requires toefl")
        );
      })
    ) {
      return "Not stated";
    }
    return "Meets";
  }

  if (row.key === "major") {
    return opportunity.eligibility.majorRequirement === null
      ? "Not stated"
      : "Not stated";
  }

  return opportunity.eligibility.otherConditions.length === 0
    ? "Not stated"
    : "Not stated";
}

function verdictClass(verdict: Verdict): string {
  if (verdict === "Meets") {
    return "text-status-eligible-foreground";
  }
  if (verdict === "Does not meet") {
    return "text-status-not-eligible-foreground";
  }
  return "text-status-needs-verification-foreground";
}

function sourceFieldForRow(row: RequirementRow, evidenceField: string): string {
  if (row.key === "english" && evidenceField === "eligibility.englishTest") {
    return "eligibility.minEnglishScore";
  }
  return evidenceField;
}

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const { state, addTasks } = useApp();
  const [sourceOpen, setSourceOpen] = useState(false);
  const [activeField, setActiveField] = useState<string | null>(null);
  const opportunity = state.opportunities.find(
    (item) => item.id === params.id,
  );

  if (opportunity === undefined || state.profile === null) {
    return (
      <main className="min-h-screen bg-slate-50 px-5 py-16 text-navy sm:px-8">
        <div className="mx-auto max-w-5xl">
          <h1 className="text-3xl font-bold">Opportunity not found</h1>
          <Link
            href="/"
            className="mt-5 inline-block font-semibold underline underline-offset-4"
          >
            Back to dashboard
          </Link>
        </div>
      </main>
    );
  }

  const currentOpportunity = opportunity;
  const profile = state.profile;
  const result = evaluateEligibility(currentOpportunity, profile, TODAY);
  const opportunityTasks = state.tasks.filter(
    (task) => task.opportunityId === currentOpportunity.id,
  );
  const { eligibility } = currentOpportunity;
  const requirements: RequirementRow[] = [
    {
      key: "year",
      requirement: "Year of study",
      stated: formatYearRequirement(eligibility.minYear, eligibility.maxYear),
      profileValue: `Year ${profile.studyYear}`,
      sourceField:
        eligibility.minYear !== null
          ? "eligibility.minYear"
          : "eligibility.maxYear",
    },
    {
      key: "gpa",
      requirement: "Minimum GPA",
      stated:
        eligibility.minGpa === null ? "Not stated" : `${eligibility.minGpa} / 4.0`,
      profileValue: `${profile.gpa} / ${profile.gpaScale}`,
      sourceField: "eligibility.minGpa",
    },
    {
      key: "english",
      requirement: "English test",
      stated: formatEnglishRequirement(
        eligibility.englishTest,
        eligibility.minEnglishScore,
      ),
      profileValue: formatProfileEnglish(
        profile.englishTest,
        profile.englishScore,
      ),
      sourceField: "eligibility.englishTest",
    },
    {
      key: "major",
      requirement: "Major",
      stated: eligibility.majorRequirement ?? "No major requirement stated",
      profileValue: profile.major,
      sourceField: "eligibility.majorRequirement",
    },
    {
      key: "other",
      requirement: "Other conditions",
      stated:
        eligibility.otherConditions.length > 0
          ? eligibility.otherConditions.join(" ")
          : "None stated",
      profileValue: "Review profile and announcement",
      sourceField: "eligibility.otherConditions",
    },
  ];

  function quoteForField(field: string): string | null {
    return (
      currentOpportunity.evidence.find((entry) => entry.field === field)?.quote ??
      null
    );
  }

  function handleSource(field: string) {
    if (sourceOpen && activeField === field) {
      setActiveField(null);
      setSourceOpen(false);
      return;
    }

    setActiveField(field);
    setSourceOpen(true);
  }

  function handleSourceToggle() {
    if (sourceOpen) {
      setActiveField(null);
      setSourceOpen(false);
    } else {
      setSourceOpen(true);
    }
  }

  function handlePlanApplication() {
    if (result.status === "NOT_ELIGIBLE") {
      return;
    }

    if (opportunityTasks.length === 0) {
      addTasks(generateTasks(currentOpportunity, profile, new Date()));
    }
    router.push("/planner");
  }

  const activeQuote =
    activeField === null ? null : quoteForField(activeField);
  const activeLabel =
    activeField === null ? "Source text" : `Source text for ${activeField}`;

  return (
    <main className="min-h-screen bg-slate-50 text-navy">
      <header className="bg-navy text-white">
        <div className="mx-auto max-w-5xl px-5 py-8 sm:px-8">
          <Link
            href="/"
            className="text-sm font-medium text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-navy"
          >
            Back to dashboard
          </Link>
          <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-300">
                {formatCategory(opportunity.category)}
              </p>
              <h1 className="mt-3 break-words text-3xl font-bold tracking-tight sm:text-4xl">
                {opportunity.title}
              </h1>
              <p className="mt-3 text-sm text-slate-300">
                {opportunity.organizer ?? "Organiser not stated"}
              </p>
            </div>
            <div className="shrink-0">
              <EligibilityBadge status={result.status} />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <section className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Organiser</p>
            <p className="mt-2 break-words font-semibold">
              {opportunity.organizer ?? "Not stated"}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Deadline</p>
            <p className="mt-2 font-semibold">
              {formatDeadline(opportunity.deadline)}
            </p>
          </div>
        </section>

        {opportunity.sourceUrl !== null && (
          <p className="mt-5 text-sm">
            <a
              href={opportunity.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-navy underline underline-offset-4 hover:text-slate-600"
            >
              View source announcement
            </a>
          </p>
        )}

        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">
            Requirements vs your profile
          </h2>
          <div className="mt-5 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="grid grid-cols-1 gap-2 border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:gap-4 sm:px-6">
              <p>Requirement as stated</p>
              <p>Your profile</p>
              <p>Verdict</p>
            </div>
            {requirements.map((row) => {
              const evidenceField = sourceFieldForRow(row, row.sourceField);
              const verdict = requirementVerdict(row, currentOpportunity, result);

              return (
                <div
                  key={row.key}
                  className="grid grid-cols-1 gap-3 border-b border-slate-200 px-4 py-4 last:border-b-0 sm:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_auto] sm:items-center sm:gap-4 sm:px-6"
                >
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {row.requirement}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleSource(evidenceField)}
                        className="text-xs font-semibold text-navy underline underline-offset-4 hover:text-slate-600 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
                      >
                        Source
                      </button>
                    </div>
                    <p className="mt-1 break-words text-sm text-slate-700">
                      {row.stated}
                    </p>
                  </div>
                  <p className="min-w-0 break-words text-sm font-medium text-navy">
                    {row.profileValue}
                  </p>
                  <p className={`text-sm font-semibold ${verdictClass(verdict)}`}>
                    {verdict}
                  </p>
                </div>
              );
            })}
          </div>
        </section>

        <section className="mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Evidence</h2>
              <p className="mt-1 text-sm text-slate-500">
                {currentOpportunity.evidence.length}{" "}
                {currentOpportunity.evidence.length === 1 ? "quote" : "quotes"}{" "}
                available
              </p>
            </div>
            <button
              type="button"
              onClick={handleSourceToggle}
              aria-expanded={sourceOpen}
              aria-controls="source-text-panel"
              className="self-start rounded-md border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:border-slate-500 hover:text-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 sm:self-auto"
            >
              {sourceOpen ? "Hide source text" : "View source text"} (
              {currentOpportunity.evidence.length}{" "}
              {currentOpportunity.evidence.length === 1 ? "quote" : "quotes"})
            </button>
          </div>

          {sourceOpen && (
            <div id="source-text-panel" className="mt-5">
              <EvidenceQuote
                rawText={currentOpportunity.rawText}
                quote={activeQuote}
                label={activeLabel}
              />
            </div>
          )}

          <div className="mt-5 grid gap-4">
            {currentOpportunity.evidence.length > 0 ? (
              currentOpportunity.evidence.map((entry, index) => (
                <button
                  key={`${entry.field}-${index}`}
                  type="button"
                  onClick={() => handleSource(entry.field)}
                  className="rounded-lg border border-slate-200 bg-white p-5 text-left shadow-sm hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {entry.field}
                  </p>
                  <blockquote className="mt-3 border-l-2 border-slate-300 pl-4 text-sm leading-6 text-slate-700">
                    “{entry.quote}”
                  </blockquote>
                </button>
              ))
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
                No supporting quotes were provided.
              </div>
            )}
          </div>
        </section>

        {result.status === "NOT_ELIGIBLE" && result.blockers.length > 0 && (
          <section className="mt-12 rounded-lg border border-status-not-eligible-ring bg-status-not-eligible-background p-5">
            <h2 className="text-lg font-bold text-status-not-eligible-foreground">
              Why this is not eligible
            </h2>
            <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-status-not-eligible-foreground">
              {result.blockers.map((blocker) => (
                <li key={blocker}>{blocker}</li>
              ))}
            </ul>
          </section>
        )}

        <section className="mt-12">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">
                Match score
              </h2>
              <p className="mt-1 text-sm text-slate-500">
                Ordering only, never a probability.
              </p>
            </div>
          </div>

          <div className="mt-5 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
            <ScoreBreakdown
              breakdown={result.breakdown}
              score={result.score}
              status={result.status}
            />
          </div>
        </section>

        <section className="mt-12 rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-lg font-bold">Plan my application</h2>
              <p className="mt-1 text-sm text-slate-500">
                Create a focused checklist from the required documents and
                deadline.
              </p>
            </div>
            {result.status === "NOT_ELIGIBLE" ? (
              <button
                type="button"
                disabled
                title="Hard requirements are not met."
                className="cursor-not-allowed rounded-md bg-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-500"
              >
                Plan my application
              </button>
            ) : opportunityTasks.length > 0 ? (
              <Link
                href="/planner"
                className="rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              >
                View application plan
              </Link>
            ) : (
              <button
                type="button"
                onClick={handlePlanApplication}
                className="rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              >
                Plan my application
              </button>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

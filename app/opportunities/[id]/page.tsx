"use client";

import Link from "next/link";
import { useParams } from "next/navigation";

import EligibilityBadge from "@/components/EligibilityBadge";
import { useApp } from "@/lib/store";
import { evaluateEligibility } from "@/lib/rules";

const TODAY = new Date();

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

function formatScore(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export default function OpportunityDetailPage() {
  const params = useParams<{ id: string }>();
  const { state } = useApp();
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

  const profile = state.profile;
  const result = evaluateEligibility(opportunity, profile, TODAY);
  const displayedScore = result.status === "NOT_ELIGIBLE" ? 0 : result.score;
  const { eligibility } = opportunity;

  const requirements = [
    {
      requirement: "Year of study",
      stated: formatYearRequirement(eligibility.minYear, eligibility.maxYear),
      profileValue: `Year ${profile.studyYear}`,
    },
    {
      requirement: "Minimum GPA",
      stated:
        eligibility.minGpa === null ? "Not stated" : `${eligibility.minGpa} / 4.0`,
      profileValue: `${profile.gpa} / ${profile.gpaScale}`,
    },
    {
      requirement: "English test",
      stated: formatEnglishRequirement(
        eligibility.englishTest,
        eligibility.minEnglishScore,
      ),
      profileValue: formatProfileEnglish(
        profile.englishTest,
        profile.englishScore,
      ),
    },
    {
      requirement: "Major",
      stated: eligibility.majorRequirement ?? "No major requirement stated",
      profileValue: profile.major,
    },
    {
      requirement: "Other conditions",
      stated:
        eligibility.otherConditions.length > 0
          ? eligibility.otherConditions.join(" ")
          : "None stated",
      profileValue: "Review profile and announcement",
    },
  ];

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
            <div className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] border-b border-slate-200 bg-slate-100 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-slate-600 sm:px-6">
              <p>Requirement as stated</p>
              <p>Your profile</p>
            </div>
            {requirements.map((item) => (
              <div
                key={item.requirement}
                className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-4 border-b border-slate-200 px-4 py-4 last:border-b-0 sm:px-6"
              >
                <div className="min-w-0">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {item.requirement}
                  </p>
                  <p className="mt-1 break-words text-sm text-slate-700">
                    {item.stated}
                  </p>
                </div>
                <p className="min-w-0 break-words self-end text-sm font-medium text-navy sm:self-center">
                  {item.profileValue}
                </p>
              </div>
            ))}
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
            <div className="text-right">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                Total
              </p>
              <p className="mt-1 text-3xl font-bold text-navy">
                {displayedScore}
              </p>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ["G", "Academic fit", "35%", result.breakdown.G],
              ["Y", "Year fit", "30%", result.breakdown.Y],
              ["R", "Relevance", "20%", result.breakdown.R],
              ["T", "Time readiness", "15%", result.breakdown.T],
            ].map(([code, label, weight, value]) => (
              <div
                key={code}
                className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-center justify-between gap-3">
                  <p className="text-lg font-bold text-navy">{code}</p>
                  <p className="text-xs font-semibold text-slate-500">
                    weight {weight}
                  </p>
                </div>
                <p className="mt-4 text-sm text-slate-600">{label}</p>
                <p className="mt-2 text-2xl font-bold text-navy">
                  {formatScore(Number(value))}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <h2 className="text-2xl font-bold tracking-tight">Evidence</h2>
          <div className="mt-5 grid gap-4">
            {opportunity.evidence.length > 0 ? (
              opportunity.evidence.map((entry, index) => (
                <div
                  key={`${entry.field}-${index}`}
                  className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {entry.field}
                  </p>
                  <blockquote className="mt-3 border-l-2 border-slate-300 pl-4 text-sm leading-6 text-slate-700">
                    “{entry.quote}”
                  </blockquote>
                </div>
              ))
            ) : (
              <div className="rounded-lg border border-slate-200 bg-white p-5 text-sm text-slate-600 shadow-sm">
                No supporting quotes were provided.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

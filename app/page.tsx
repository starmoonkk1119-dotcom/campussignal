"use client";

import Link from "next/link";

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

export default function HomePage() {
  const { state } = useApp();
  const profile = state.profile;
  const evaluated =
    profile === null
      ? []
      : state.opportunities.map((opportunity) => ({
          opportunity,
          result: evaluateEligibility(opportunity, profile, TODAY),
        }));

  const eligibleCount = evaluated.filter(
    ({ result }) => result.status === "ELIGIBLE",
  ).length;
  const needsVerificationCount = evaluated.filter(
    ({ result }) => result.status === "NEEDS_VERIFICATION",
  ).length;
  const nextApplications = evaluated
    .filter(({ result }) => result.status !== "NOT_ELIGIBLE")
    .sort((a, b) => b.result.score - a.result.score)
    .slice(0, 3);
  const nearestDeadlines = [...evaluated].sort((a, b) => {
    if (a.opportunity.deadline === null && b.opportunity.deadline === null) {
      return 0;
    }
    if (a.opportunity.deadline === null) {
      return 1;
    }
    if (b.opportunity.deadline === null) {
      return -1;
    }
    return a.opportunity.deadline.localeCompare(b.opportunity.deadline);
  });

  return (
    <main className="min-h-screen bg-slate-50 text-navy">
      <header className="bg-navy text-white">
        <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
          <p className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-300">
            Student opportunity workspace
          </p>
          <h1 className="mt-3 text-4xl font-bold tracking-tight sm:text-5xl">
            CampusSignal
          </h1>
          <p className="mt-4 text-sm text-slate-300">
            Demo data — sample opportunities for illustration.
          </p>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
        <section
          aria-label="Opportunity metrics"
          className="grid grid-cols-2 gap-4 lg:grid-cols-4"
        >
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Total opportunities</p>
            <p className="mt-3 text-3xl font-bold text-navy">
              {state.opportunities.length}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Eligible</p>
            <p className="mt-3 text-3xl font-bold text-status-eligible-foreground">
              {eligibleCount}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Needs verification</p>
            <p className="mt-3 text-3xl font-bold text-status-needs-verification-foreground">
              {needsVerificationCount}
            </p>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">Tasks due in next 7 days</p>
            <p className="mt-3 text-3xl font-bold text-navy">0</p>
          </div>
        </section>

        <section className="mt-12">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
                Shortlist
              </p>
              <h2 className="mt-2 text-2xl font-bold tracking-tight">
                What should I apply for next?
              </h2>
            </div>
            <p className="hidden text-sm text-slate-500 sm:block">
              Ranked by match score
            </p>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-3">
            {nextApplications.map(({ opportunity, result }) => (
              <Link
                key={opportunity.id}
                href={`/opportunities/${opportunity.id}`}
                className="group rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
              >
                <div className="flex items-start justify-between gap-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {formatCategory(opportunity.category)}
                  </p>
                  <EligibilityBadge status={result.status} />
                </div>
                <h3 className="mt-4 text-lg font-semibold leading-6 text-navy group-hover:underline">
                  {opportunity.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">
                  {result.reasons[0]}
                </p>
                <p className="mt-3 text-sm text-slate-500">
                  Next step:{" "}
                  {result.status === "ELIGIBLE"
                    ? "Review the requirements and deadline."
                    : "Verify the missing details before applying."}
                </p>
                <p className="mt-5 text-sm font-semibold text-slate-500">
                  Match score: {result.score}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section className="mt-12">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              Timeline
            </p>
            <h2 className="mt-2 text-2xl font-bold tracking-tight">
              Nearest deadlines
            </h2>
          </div>

          <div className="mt-6 grid gap-3">
            {nearestDeadlines.map(({ opportunity, result }) => (
              <Link
                key={opportunity.id}
                href={`/opportunities/${opportunity.id}`}
                className="grid min-w-0 gap-4 rounded-lg border border-slate-200 bg-white p-5 shadow-sm transition hover:border-slate-400 focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2 sm:grid-cols-[minmax(0,1fr)_auto_auto] sm:items-center"
              >
                <div className="min-w-0">
                  <h3 className="truncate text-base font-semibold text-navy">
                    {opportunity.title}
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {formatCategory(opportunity.category)} ·{" "}
                    {opportunity.organizer ?? "Organizer not stated"}
                  </p>
                </div>
                <p className="text-sm font-medium text-slate-600">
                  {formatDeadline(opportunity.deadline)}
                </p>
                <EligibilityBadge status={result.status} />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </main>
  );
}

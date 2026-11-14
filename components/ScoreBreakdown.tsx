import type { EligibilityStatus, MatchResult } from "@/lib/types";

type ScoreBreakdownProps = {
  breakdown: MatchResult["breakdown"];
  score: number;
  status: EligibilityStatus;
};

const scoreComponents: Array<{
  code: keyof MatchResult["breakdown"];
  label: string;
  weight: string;
}> = [
  { code: "G", label: "Academic fit", weight: "0.35" },
  { code: "Y", label: "Year fit", weight: "0.30" },
  { code: "R", label: "Relevance", weight: "0.20" },
  { code: "T", label: "Time readiness", weight: "0.15" },
];

export default function ScoreBreakdown({
  breakdown,
  score,
  status,
}: ScoreBreakdownProps) {
  const hardRequirementFailure = status === "NOT_ELIGIBLE";

  return (
    <section aria-label="Score breakdown">
      {hardRequirementFailure && (
        <p className="mb-5 rounded-lg border border-status-not-eligible-ring bg-status-not-eligible-background p-4 text-sm leading-6 text-status-not-eligible-foreground">
          Hard requirements not met — the match score is not shown, because a
          high score would be misleading.
        </p>
      )}

      <div className="grid gap-5">
        {scoreComponents.map(({ code, label, weight }) => {
          const value = hardRequirementFailure ? 0 : breakdown[code];

          return (
            <div key={code}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <p className="font-semibold text-navy">
                  {label} × {weight}
                </p>
                <p className="font-medium text-slate-500">
                  {Math.round(value * 100)}%
                </p>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className="h-full bg-navy"
                  style={{ width: `${value * 100}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-7 flex items-baseline justify-between border-t border-slate-200 pt-5">
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">
          Total
        </p>
        <p className="text-3xl font-bold text-navy">
          {hardRequirementFailure ? 0 : score}
        </p>
      </div>
    </section>
  );
}

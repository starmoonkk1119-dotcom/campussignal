import { describe, expect, it } from "vitest";

import { evaluateEligibility } from "../lib/rules";
import { seedOpportunities, seedProfile } from "../lib/seed";

const today = new Date(2026, 0, 10);

describe("seed data", () => {
  const opportunities = seedOpportunities(today);
  const profile = seedProfile();

  it("covers the three eligibility states", () => {
    const statuses = opportunities.map(
      (opportunity) => evaluateEligibility(opportunity, profile, today).status,
    );

    expect(statuses).toContain("ELIGIBLE");
    expect(statuses).toContain("NOT_ELIGIBLE");
    expect(statuses).toContain("NEEDS_VERIFICATION");
  });

  it("keeps the not-eligible opportunity attractive on tags and score", () => {
    const internship = opportunities.find(
      (opportunity) => opportunity.category === "internship",
    )!;
    const result = evaluateEligibility(internship, profile, today);

    expect(result.status).toBe("NOT_ELIGIBLE");
    expect(result.score).toBe(0);
    expect(result.blockers.join(" ")).toContain("year 3");
  });

  it("gives every quote a home in its own raw text", () => {
    for (const opportunity of opportunities) {
      for (const entry of opportunity.evidence) {
        expect(
          opportunity.rawText.includes(entry.quote),
          `${opportunity.id} :: ${entry.field}`,
        ).toBe(true);
      }
    }
  });

  it("attaches no evidence to a requirement that was never stated", () => {
    for (const opportunity of opportunities) {
      for (const entry of opportunity.evidence) {
        const key = entry.field.split(".").pop() as keyof typeof opportunity.eligibility;
        if (entry.field.startsWith("eligibility.")) {
          expect(
            opportunity.eligibility[key],
            `${opportunity.id} :: ${entry.field} is null but has a quote`,
          ).not.toBeNull();
        }
      }
    }
  });

  it("keeps announcement text substantial and deadlines in the future", () => {
    for (const opportunity of opportunities) {
      expect(opportunity.rawText.length).toBeGreaterThan(400);
      if (opportunity.deadline !== null) {
        expect(opportunity.deadline > "2026-01-10").toBe(true);
      }
    }
  });
});

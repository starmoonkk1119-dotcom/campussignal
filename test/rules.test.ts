import { describe, expect, it } from "vitest";

import {
  evaluateEligibility,
  scoreOpportunity,
} from "../lib/rules";
import type {
  EligibilityCriteria,
  Opportunity,
  UserProfile,
} from "../lib/types";

const today = new Date(2026, 0, 10, 15, 30);

function makeEligibility(
  overrides: Partial<EligibilityCriteria> = {},
): EligibilityCriteria {
  return {
    minYear: 1,
    maxYear: 4,
    minGpa: 3,
    englishTest: null,
    minEnglishScore: null,
    majorRequirement: null,
    otherConditions: [],
    ...overrides,
  };
}

function makeOpportunity(
  overrides: Partial<Opportunity> = {},
): Opportunity {
  return {
    id: "opportunity-1",
    title: "Campus Research Fellowship",
    category: "research",
    organizer: "Campus Lab",
    summary: "A research opportunity.",
    sourceUrl: null,
    deadline: "2026-01-31",
    rawText: "Applications are open.",
    eligibility: makeEligibility(),
    requiredDocuments: [],
    tags: ["research", "analysis"],
    uncertainFields: [],
    evidence: [],
    createdAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeProfile(
  overrides: Partial<UserProfile> = {},
): UserProfile {
  return {
    name: "Alex Student",
    studyYear: 2,
    major: "computer science",
    gpa: 3.5,
    gpaScale: "4.0",
    englishTest: null,
    englishScore: null,
    skills: ["research"],
    interests: ["analysis"],
    weeklyHours: 8,
    ...overrides,
  };
}

describe("evaluateEligibility", () => {
  it("rejects a year 2 student when year 3 is required", () => {
    const result = evaluateEligibility(
      makeOpportunity({
        eligibility: makeEligibility({ minYear: 3 }),
      }),
      makeProfile({ studyYear: 2 }),
      today,
    );

    expect(result.status).toBe("NOT_ELIGIBLE");
    expect(result.score).toBe(0);
    expect(result.blockers).toEqual([
      "Requires year 3 or above; you are year 2.",
    ]);
  });

  it("does not let a high GPA and matching tags override a year blocker", () => {
    const result = evaluateEligibility(
      makeOpportunity({
        tags: ["computer", "science", "research", "analysis", "campus"],
        eligibility: makeEligibility({ minYear: 3 }),
      }),
      makeProfile({
        gpa: 3.9,
        skills: ["computer", "science", "research", "analysis", "campus"],
        interests: [],
      }),
      today,
    );

    expect(result.status).toBe("NOT_ELIGIBLE");
    expect(result.score).toBe(0);
    expect(result.blockers).toHaveLength(1);
  });

  it("rejects a GPA below the minimum and mentions both values", () => {
    const result = evaluateEligibility(
      makeOpportunity({
        eligibility: makeEligibility({ minGpa: 3.5 }),
      }),
      makeProfile({ gpa: 3.2 }),
      today,
    );

    expect(result.status).toBe("NOT_ELIGIBLE");
    expect(result.blockers).toHaveLength(1);
    expect(result.blockers[0]).toContain("3.5");
    expect(result.blockers[0]).toContain("3.2");
  });

  it("needs verification when the GPA requirement is missing", () => {
    const result = evaluateEligibility(
      makeOpportunity({
        eligibility: makeEligibility({ minGpa: null }),
      }),
      makeProfile(),
      today,
    );

    expect(result.status).toBe("NEEDS_VERIFICATION");
    expect(result.verificationNotes).toContain(
      "GPA requirement is not stated in the announcement.",
    );
  });

  it("returns eligible when all specified requirements are satisfied", () => {
    const result = evaluateEligibility(
      makeOpportunity({
        eligibility: makeEligibility({
          minYear: 2,
          maxYear: 4,
          minGpa: 3.2,
          englishTest: "IELTS",
          minEnglishScore: 7,
        }),
      }),
      makeProfile({
        studyYear: 2,
        gpa: 3.5,
        englishTest: "IELTS",
        englishScore: 7.5,
      }),
      today,
    );

    expect(result.status).toBe("ELIGIBLE");
    expect(result.verificationNotes).toEqual([]);
    expect(result.blockers).toEqual([]);
  });

  it("needs verification when the required English test differs", () => {
    const result = evaluateEligibility(
      makeOpportunity({
        eligibility: makeEligibility({
          englishTest: "TOEFL",
          minEnglishScore: 90,
        }),
      }),
      makeProfile({
        englishTest: "IELTS",
        englishScore: 7.5,
      }),
      today,
    );

    expect(result.status).toBe("NEEDS_VERIFICATION");
    expect(result.verificationNotes).toContain(
      "Requires TOEFL; your profile lists IELTS. Scores are not converted.",
    );
  });

  it("uses T = 0.2 when the deadline is two days away", () => {
    const result = scoreOpportunity(
      makeOpportunity({ deadline: "2026-01-12" }),
      makeProfile(),
      today,
    );

    expect(result.breakdown.T).toBe(0.2);
  });

  it("blocks a past deadline and scores time readiness as zero", () => {
    const opportunity = makeOpportunity({ deadline: "2026-01-09" });
    const scored = scoreOpportunity(opportunity, makeProfile(), today);
    const result = evaluateEligibility(opportunity, makeProfile(), today);

    expect(scored.breakdown.T).toBe(0);
    expect(result.status).toBe("NOT_ELIGIBLE");
    expect(result.blockers).toContain("Deadline has passed.");
  });

  it("needs verification when the test matches but no score is recorded", () => {
    const result = evaluateEligibility(
      makeOpportunity({
        eligibility: makeEligibility({
          englishTest: "IELTS",
          minEnglishScore: 7,
        }),
      }),
      makeProfile({ englishTest: "IELTS", englishScore: null }),
      today,
    );

    expect(result.status).toBe("NEEDS_VERIFICATION");
    expect(result.verificationNotes).toContain(
      "Requires IELTS 7; your IELTS score is not recorded.",
    );
  });

  it("does not report a contradictory test note when no test is recorded", () => {
    const result = evaluateEligibility(
      makeOpportunity({
        eligibility: makeEligibility({
          englishTest: "TOEFL",
          minEnglishScore: 90,
        }),
      }),
      makeProfile({ englishTest: null, englishScore: null }),
      today,
    );

    expect(result.status).toBe("NEEDS_VERIFICATION");
    expect(result.verificationNotes).toContain(
      "Requires TOEFL 90; you have not added a test score.",
    );
    expect(
      result.verificationNotes.some((note) => note.includes("lists null")),
    ).toBe(false);
  });

  it("never reports a strong academic fit when a hard requirement blocks", () => {
    const result = evaluateEligibility(
      makeOpportunity({
        tags: ["consulting", "data"],
        eligibility: makeEligibility({ minYear: 3 }),
      }),
      makeProfile({
        gpa: 3.9,
        skills: ["consulting", "data"],
      }),
      today,
    );

    expect(result.status).toBe("NOT_ELIGIBLE");
    expect(result.reasons).not.toContain("Strong academic fit.");
  });

  it("is deterministic for identical inputs", () => {
    const opportunity = makeOpportunity({
      eligibility: makeEligibility({
        minYear: 2,
        maxYear: 4,
        minGpa: 3.2,
        englishTest: "IELTS",
        minEnglishScore: 7,
      }),
    });
    const profile = makeProfile({
      studyYear: 2,
      gpa: 3.5,
      englishTest: "IELTS",
      englishScore: 7.5,
    });

    const first = evaluateEligibility(opportunity, profile, today);
    const second = evaluateEligibility(opportunity, profile, today);

    expect(first).toEqual(second);
  });
});

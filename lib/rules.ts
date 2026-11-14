/*
Eligibility status and score are computed separately because hard requirements determine whether a student can apply, while score only orders opportunities.
A high score must never override a failed requirement, so eligibility applies blockers after reusing the pure scoring result.
Keeping scoring in scoreOpportunity makes the ordering formula independently testable and deterministic.
*/

import type {
  MatchResult,
  Opportunity,
  UserProfile,
} from "./types";

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateOnly(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function calendarDayNumber(value: Date): number {
  return Date.UTC(
    value.getFullYear(),
    value.getMonth(),
    value.getDate(),
  ) / DAY_IN_MILLISECONDS;
}

function daysBetween(today: Date, deadline: Date): number {
  return calendarDayNumber(deadline) - calendarDayNumber(today);
}

function matchingTags(opp: Opportunity, profile: UserProfile): string[] {
  const terms = [...profile.skills, ...profile.interests, profile.major].map(
    (term) => term.toLowerCase(),
  );

  return opp.tags.filter((tag) => {
    const normalizedTag = tag.toLowerCase();
    return terms.some(
      (term) => normalizedTag.includes(term) || term.includes(normalizedTag),
    );
  });
}

function scoreReasons(
  opp: Opportunity,
  profile: UserProfile,
  breakdown: MatchResult["breakdown"],
  today: Date,
  blockers: string[],
): string[] {
  const reasons: string[] = [];
  const tags = matchingTags(opp, profile);

  // A reason must never contradict a blocker: an opportunity the student cannot
  // apply to must not be described as a strong fit.
  const academicBlocked = blockers.some(
    (b) => b.startsWith("Requires GPA") || b.startsWith("Requires year"),
  );
  const yearBlocked = blockers.some((b) => b.startsWith("Open to year"));

  if (academicBlocked) {
    reasons.push("Academic profile is below a stated requirement.");
  } else if (breakdown.G === 1) {
    reasons.push("Strong academic fit.");
  } else if (breakdown.G === 0.6) {
    reasons.push("Academic fit needs verification.");
  } else if (breakdown.G === 0) {
    reasons.push("Academic fit is below the stated threshold.");
  } else {
    reasons.push("Academic fit is close to the stated threshold.");
  }

  if (yearBlocked) {
    reasons.push("Study year is outside the stated range.");
  } else if (breakdown.Y === 1) {
    reasons.push("Study year fits the requirement.");
  } else if (breakdown.Y === 0) {
    reasons.push("Study year is outside the stated range.");
  } else {
    reasons.push("No year-of-study range is stated.");
  }

  if (breakdown.R === 1) {
    reasons.push("Strong relevance match.");
  } else if (tags.length > 0) {
    reasons.push(`Matches your profile in ${tags[0]}.`);
  } else if (opp.tags.length === 0) {
    reasons.push("No relevance tags are available.");
  } else {
    reasons.push("Limited relevance match.");
  }

  if (opp.deadline === null) {
    reasons.push("Deadline is not stated.");
  } else {
    const days = daysBetween(today, parseDateOnly(opp.deadline));
    if (days < 0) {
      reasons.push("Deadline has passed.");
    } else if (days < 3) {
      reasons.push(`Deadline is in ${days} days; start now.`);
    } else if (days < 7) {
      reasons.push(`Deadline is in ${days} days; start soon.`);
    } else if (days < 21) {
      reasons.push(`Deadline is in ${days} days.`);
    } else {
      reasons.push("There is time before the deadline.");
    }
  }

  return reasons.slice(0, 4);
}

export function scoreOpportunity(
  opp: Opportunity,
  profile: UserProfile,
  today: Date,
): { score: number; breakdown: MatchResult["breakdown"] } {
  const { minGpa, minYear, maxYear } = opp.eligibility;

  const G =
    minGpa === null
      ? 0.6
      : profile.gpa >= minGpa
        ? 1
        : Math.max(0, 1 - (minGpa - profile.gpa) / 0.5);

  const hasYearRequirement = minYear !== null || maxYear !== null;
  const meetsMinYear = minYear === null || profile.studyYear >= minYear;
  const meetsMaxYear = maxYear === null || profile.studyYear <= maxYear;
  const Y = !hasYearRequirement
    ? 0.7
    : meetsMinYear && meetsMaxYear
      ? 1
      : 0;

  const tags = matchingTags(opp, profile);
  const R =
    opp.tags.length === 0
      ? 0.5
      : Math.min(
          1,
          Math.max(0, tags.length / Math.min(3, Math.max(1, opp.tags.length))),
        );

  let T: number;
  if (opp.deadline === null) {
    T = 0.5;
  } else {
    const days = daysBetween(dateOnly(today), parseDateOnly(opp.deadline));
    if (days < 0) {
      T = 0;
    } else if (days < 3) {
      T = 0.2;
    } else if (days < 7) {
      T = 0.5;
    } else if (days < 21) {
      T = 0.8;
    } else {
      T = 1;
    }
  }

  const breakdown = { G, Y, R, T };
  const score = Math.round(
    100 * (0.35 * G + 0.3 * Y + 0.2 * R + 0.15 * T),
  );

  return { score, breakdown };
}

export function evaluateEligibility(
  opp: Opportunity,
  profile: UserProfile,
  today: Date,
): MatchResult {
  const scored = scoreOpportunity(opp, profile, today);
  const { minGpa, minYear, maxYear, englishTest, minEnglishScore } =
    opp.eligibility;
  const blockers: string[] = [];
  const verificationNotes: string[] = [];

  if (minYear !== null && profile.studyYear < minYear) {
    blockers.push(
      `Requires year ${minYear} or above; you are year ${profile.studyYear}.`,
    );
  }

  if (maxYear !== null && profile.studyYear > maxYear) {
    blockers.push(`Open to year ${maxYear} and below only.`);
  }

  if (minGpa !== null && profile.gpa < minGpa) {
    blockers.push(`Requires GPA ${minGpa}; yours is ${profile.gpa}.`);
  }

  if (
    englishTest !== null &&
    minEnglishScore !== null &&
    profile.englishTest === englishTest &&
    profile.englishScore !== null &&
    profile.englishScore < minEnglishScore
  ) {
    blockers.push(
      `Requires ${englishTest} ${minEnglishScore}; yours is ${profile.englishScore}.`,
    );
  }

  if (
    opp.deadline !== null &&
    parseDateOnly(opp.deadline) < dateOnly(today)
  ) {
    blockers.push("Deadline has passed.");
  }

  if (minGpa === null) {
    verificationNotes.push(
      "GPA requirement is not stated in the announcement.",
    );
  }

  if (minYear === null && maxYear === null) {
    verificationNotes.push("No year-of-study requirement is stated.");
  }

  if (englishTest !== null && minEnglishScore !== null) {
    if (profile.englishTest === null) {
      verificationNotes.push(
        `Requires ${englishTest} ${minEnglishScore}; you have not added a test score.`,
      );
    } else if (profile.englishTest !== englishTest) {
      verificationNotes.push(
        `Requires ${englishTest}; your profile lists ${profile.englishTest}. Scores are not converted.`,
      );
    } else if (profile.englishScore === null) {
      verificationNotes.push(
        `Requires ${englishTest} ${minEnglishScore}; your ${englishTest} score is not recorded.`,
      );
    }
  }

  if (profile.gpaScale !== "4.0") {
    verificationNotes.push("GPA is compared on a 4.0 scale only.");
  }

  if (opp.deadline === null) {
    verificationNotes.push("Deadline is not stated in the announcement.");
  }

  verificationNotes.push(...opp.uncertainFields);

  const uniqueVerificationNotes = [...new Set(verificationNotes)];
  const status =
    blockers.length > 0
      ? "NOT_ELIGIBLE"
      : uniqueVerificationNotes.length > 0
        ? "NEEDS_VERIFICATION"
        : "ELIGIBLE";

  return {
    status,
    score: blockers.length > 0 ? 0 : scored.score,
    breakdown: scored.breakdown,
    reasons: scoreReasons(opp, profile, scored.breakdown, today, blockers),
    blockers,
    verificationNotes: uniqueVerificationNotes,
  };
}

import { describe, expect, it } from "vitest";

import { generateTasks } from "../lib/tasks";
import type { Opportunity, UserProfile } from "../lib/types";

const today = new Date(2026, 0, 10, 15, 30);
const priorityOrder = { high: 0, medium: 1, low: 2 };

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
    eligibility: {
      minYear: 1,
      maxYear: 4,
      minGpa: 3,
      englishTest: null,
      minEnglishScore: null,
      majorRequirement: null,
      otherConditions: [],
    },
    requiredDocuments: ["CV", "Personal statement"],
    tags: ["research"],
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

function dateValues(tasks: ReturnType<typeof generateTasks>): number[] {
  return tasks.map((task) => Date.parse(`${task.dueDate}T00:00:00`));
}

describe("generateTasks", () => {
  it("returns tasks sorted by due date and then priority", () => {
    const tasks = generateTasks(
      makeOpportunity({
        requiredDocuments: ["CV", "Essay", "Recommendation letter"],
      }),
      makeProfile(),
      today,
    );

    for (let index = 1; index < tasks.length; index += 1) {
      const previous = tasks[index - 1];
      const current = tasks[index];
      expect(
        previous.dueDate < current.dueDate ||
          (previous.dueDate === current.dueDate &&
            priorityOrder[previous.priority] <= priorityOrder[current.priority]),
      ).toBe(true);
    }
  });

  it("keeps scheduled dates between today and the deadline", () => {
    const deadline = "2026-01-31";
    const tasks = generateTasks(
      makeOpportunity({ deadline }),
      makeProfile(),
      today,
    );
    const dates = dateValues(tasks);
    const todayValue = Date.parse("2026-01-10T00:00:00");
    const deadlineValue = Date.parse(`${deadline}T00:00:00`);

    expect(Math.min(...dates)).toBeGreaterThanOrEqual(todayValue);
    expect(Math.max(...dates)).toBeLessThanOrEqual(deadlineValue);
  });

  it("compresses a five-day plan across at least three dates", () => {
    const deadline = "2026-01-15";
    const tasks = generateTasks(
      makeOpportunity({
        deadline,
        requiredDocuments: [
          "CV",
          "Personal statement",
          "Transcript",
          "Proposal",
          "Recommendation letter",
          "Portfolio",
        ],
      }),
      makeProfile(),
      today,
    );
    const dates = tasks.map((task) => task.dueDate);

    expect(tasks.length).toBeGreaterThanOrEqual(6);
    expect(dates).toEqual([...dates].sort());
    expect(new Set(dates).size).toBeGreaterThanOrEqual(3);
    expect(
      dates.every((date) => date >= "2026-01-10" && date <= deadline),
    ).toBe(true);
  });

  it("creates one preparation task for every required document", () => {
    const requiredDocuments = ["CV", "Essay", "Transcript"];
    const tasks = generateTasks(
      makeOpportunity({ requiredDocuments }),
      makeProfile(),
      today,
    );

    expect(
      tasks.filter((task) => task.name.startsWith("Prepare ")),
    ).toHaveLength(requiredDocuments.length);
  });

  it("uses provisional dates and prefixes the first base task for an unknown deadline", () => {
    const tasks = generateTasks(
      makeOpportunity({ deadline: null }),
      makeProfile(),
      today,
    );

    expect(tasks[0].name).toMatch(
      /^Deadline unknown — dates are provisional\. /,
    );
    expect(tasks.every((task) => task.dueDate >= "2026-01-10")).toBe(true);
    expect(tasks.every((task) => task.dueDate <= "2026-01-24")).toBe(true);
  });

  it("adds a focused work block when weekly hours are below five", () => {
    const tasks = generateTasks(
      makeOpportunity(),
      makeProfile({ weeklyHours: 4 }),
      today,
    );
    const workBlock = tasks.find(
      (task) => task.name === "Reserve a focused work block this week",
    );

    expect(workBlock).toBeDefined();
    expect(workBlock?.priority).toBe("high");
    expect(workBlock?.dueDate).toBe("2026-01-12");
  });

  it("never schedules the work block after the deadline", () => {
    const deadline = "2026-01-11";
    const tasks = generateTasks(
      makeOpportunity({ deadline, requiredDocuments: ["CV"] }),
      makeProfile({ weeklyHours: 3 }),
      today,
    );
    const workBlock = tasks.find(
      (task) => task.name === "Reserve a focused work block this week",
    );

    expect(workBlock).toBeDefined();
    expect(workBlock!.dueDate <= deadline).toBe(true);
    expect(tasks.every((task) => task.dueDate <= deadline)).toBe(true);
  });

  it("prefixes the confirm task, not the work block, for an unknown deadline", () => {
    const tasks = generateTasks(
      makeOpportunity({ deadline: null }),
      makeProfile({ weeklyHours: 3 }),
      today,
    );
    const prefixed = tasks.filter((task) =>
      task.name.startsWith("Deadline unknown"),
    );

    expect(prefixed).toHaveLength(1);
    expect(prefixed[0].name).toContain("Confirm eligibility requirements");
  });

  it("adds a recommendation task only for recommendation documents", () => {
    const withRecommendation = generateTasks(
      makeOpportunity({ requiredDocuments: ["CV", "Recommendation letter"] }),
      makeProfile(),
      today,
    );
    const withoutRecommendation = generateTasks(
      makeOpportunity({ requiredDocuments: ["CV", "Transcript"] }),
      makeProfile(),
      today,
    );

    expect(
      withRecommendation.some(
        (task) => task.name === "Ask a referee for a recommendation letter",
      ),
    ).toBe(true);
    expect(
      withoutRecommendation.some(
        (task) => task.name === "Ask a referee for a recommendation letter",
      ),
    ).toBe(false);
  });
});

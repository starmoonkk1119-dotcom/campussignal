import type {
  ApplicationTask,
  Opportunity,
  TaskPriority,
  UserProfile,
} from "./types";

type PlannedTask = {
  name: string;
  priority: TaskPriority;
  offset: number;
  dueDate: string;
};

const DAY_IN_MILLISECONDS = 24 * 60 * 60 * 1000;
const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function dateOnly(value: Date): Date {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function parseDateOnly(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function calendarDayNumber(value: Date): number {
  return (
    Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()) /
    DAY_IN_MILLISECONDS
  );
}

function daysBetween(start: Date, end: Date): number {
  return calendarDayNumber(end) - calendarDayNumber(start);
}

function addDays(value: Date, days: number): Date {
  const result = dateOnly(value);
  result.setDate(result.getDate() + days);
  return result;
}

function formatDate(value: Date): string {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function priorityForDocument(document: string): TaskPriority {
  const normalizedDocument = document.toLowerCase();
  return normalizedDocument.includes("personal statement") ||
    normalizedDocument.includes("essay") ||
    normalizedDocument.includes("proposal")
    ? "high"
    : "medium";
}

function comparePlannedTasks(a: PlannedTask, b: PlannedTask): number {
  return (
    a.dueDate.localeCompare(b.dueDate) ||
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
    b.offset - a.offset
  );
}

function toApplicationTask(
  plannedTask: PlannedTask,
  opportunityId: string,
): ApplicationTask {
  return {
    id: crypto.randomUUID(),
    opportunityId,
    name: plannedTask.name,
    dueDate: plannedTask.dueDate,
    status: "todo",
    priority: plannedTask.priority,
    isCustom: false,
  };
}

export function generateTasks(
  opp: Opportunity,
  profile: UserProfile,
  today: Date,
): ApplicationTask[] {
  const todayDate = dateOnly(today);
  const hasUnknownDeadline = opp.deadline === null;
  const deadlineDate = opp.deadline === null
    ? addDays(todayDate, 14)
    : parseDateOnly(opp.deadline);
  const available = daysBetween(todayDate, deadlineDate);
  const scaleOffset = (offset: number): number =>
    available < 10 ? Math.floor((offset * available) / 10) : offset;
  const dueDateForOffset = (offset: number): string => {
    const dueDate = addDays(deadlineDate, -scaleOffset(offset));
    return formatDate(dueDate < todayDate ? todayDate : dueDate);
  };

  const plannedTasks: PlannedTask[] = [
    {
      name: "Confirm eligibility requirements",
      priority: "high",
      offset: 10,
      dueDate: dueDateForOffset(10),
    },
  ];

  const documentCount = opp.requiredDocuments.length;
  opp.requiredDocuments.forEach((document, index) => {
    const offset =
      documentCount === 1
        ? 9
        : Math.round(9 - (index * 6) / (documentCount - 1));

    plannedTasks.push({
      name: `Prepare ${document}`,
      priority: priorityForDocument(document),
      offset,
      dueDate: dueDateForOffset(offset),
    });
  });

  if (
    opp.requiredDocuments.some((document) =>
      document.toLowerCase().includes("recommend"),
    )
  ) {
    plannedTasks.push({
      name: "Ask a referee for a recommendation letter",
      priority: "high",
      offset: 10,
      dueDate: dueDateForOffset(10),
    });
  }

  plannedTasks.push({
    name: "Final review and submit",
    priority: "high",
    offset: 2,
    dueDate: dueDateForOffset(2),
  });

  plannedTasks.sort(comparePlannedTasks);

  const tasks = plannedTasks.map((plannedTask) =>
    toApplicationTask(plannedTask, opp.id),
  );

  if (profile.weeklyHours < 5) {
    // Never schedule work after the deadline: when the deadline is imminent the
    // work block moves to today rather than landing past the closing date.
    const workBlockDate = addDays(todayDate, 2);
    tasks.push({
      id: crypto.randomUUID(),
      opportunityId: opp.id,
      name: "Reserve a focused work block this week",
      dueDate: formatDate(
        workBlockDate > deadlineDate ? todayDate : workBlockDate,
      ),
      status: "todo",
      priority: "high",
      isCustom: false,
    });
  }

  tasks.sort(
    (a, b) =>
      a.dueDate.localeCompare(b.dueDate) ||
      PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority],
  );

  if (hasUnknownDeadline) {
    // The provisional note belongs on the first planned task, not on whatever
    // happens to sort first once the work-block task is added.
    const anchor = tasks.find(
      (task) => task.name === "Confirm eligibility requirements",
    );
    if (anchor) {
      anchor.name =
        "Deadline unknown — dates are provisional. " + anchor.name;
    }
  }

  return tasks;
}

"use client";

import Link from "next/link";

import { useApp } from "@/lib/store";
import type { ApplicationTask, TaskPriority } from "@/lib/types";

const TODAY = new Date();
const TODAY_DATE = `${TODAY.getFullYear()}-${String(TODAY.getMonth() + 1).padStart(
  2,
  "0",
)}-${String(TODAY.getDate()).padStart(2, "0")}`;

const PRIORITY_ORDER: Record<TaskPriority, number> = {
  high: 0,
  medium: 1,
  low: 2,
};

function priorityClass(priority: TaskPriority): string {
  if (priority === "high") {
    return "bg-status-not-eligible-background text-status-not-eligible-foreground";
  }
  if (priority === "medium") {
    return "bg-status-needs-verification-background text-status-needs-verification-foreground";
  }
  return "bg-slate-100 text-slate-600";
}

function sortTasks(a: ApplicationTask, b: ApplicationTask): number {
  return (
    a.dueDate.localeCompare(b.dueDate) ||
    PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority]
  );
}

export default function PlannerPage() {
  const { state, toggleTask, updateTaskDate } = useApp();
  const todoTasks = state.tasks.filter((task) => task.status === "todo");
  const groups = state.opportunities
    .map((opportunity) => ({
      opportunity,
      tasks: state.tasks
        .filter((task) => task.opportunityId === opportunity.id)
        .sort(sortTasks),
    }))
    .filter(({ tasks }) => tasks.length > 0);

  return (
    <main className="min-h-screen bg-slate-50 text-navy">
      <div className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-14">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
              Planner
            </p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">
              My application plan
            </h1>
          </div>
          <div className="rounded-lg border border-slate-200 bg-white px-5 py-4 shadow-sm">
            <p className="text-sm text-slate-500">Estimated effort</p>
            <p className="mt-1 text-2xl font-bold text-navy">
              {Math.round(todoTasks.length * 1.5)} hours
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Assumes 1.5 hours per task.
            </p>
          </div>
        </div>

        {groups.length === 0 ? (
          <section className="mt-10 rounded-lg border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h2 className="text-xl font-bold">Generate a plan from an opportunity</h2>
            <p className="mt-2 text-sm text-slate-600">
              Open an opportunity to create its application checklist.
            </p>
            <Link
              href="/"
              className="mt-5 inline-block rounded-md bg-navy px-4 py-2.5 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-2"
            >
              Back to dashboard
            </Link>
          </section>
        ) : (
          <div className="mt-10 grid gap-8">
            {groups.map(({ opportunity, tasks }) => (
              <section key={opportunity.id}>
                <h2 className="text-xl font-bold tracking-tight">
                  <Link
                    href={`/opportunities/${opportunity.id}`}
                    className="underline decoration-slate-300 underline-offset-4 hover:decoration-navy"
                  >
                    {opportunity.title}
                  </Link>
                </h2>
                <div className="mt-4 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
                  {tasks.map((task) => {
                    const overdue =
                      task.status === "todo" && task.dueDate < TODAY_DATE;

                    return (
                      <div
                        key={task.id}
                        className="grid gap-3 border-b border-slate-200 p-4 last:border-b-0 sm:grid-cols-[auto_minmax(0,1fr)_auto_auto] sm:items-center"
                      >
                        <input
                          type="checkbox"
                          checked={task.status === "done"}
                          onChange={() => toggleTask(task.id)}
                          aria-label={`Mark ${task.name} as ${
                            task.status === "done" ? "todo" : "done"
                          }`}
                          className="h-4 w-4 accent-navy"
                        />
                        <div className="min-w-0">
                          <p
                            className={`break-words text-sm font-medium ${
                              task.status === "done"
                                ? "text-slate-400 line-through"
                                : "text-navy"
                            }`}
                          >
                            {task.name}
                          </p>
                          {overdue && (
                            <p className="mt-1 text-xs font-semibold text-status-not-eligible-foreground">
                              Overdue
                            </p>
                          )}
                        </div>
                        <input
                          type="date"
                          value={task.dueDate}
                          onChange={(event) =>
                            updateTaskDate(task.id, event.target.value)
                          }
                          aria-label={`Due date for ${task.name}`}
                          className="rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-navy focus:border-navy focus:outline-none focus:ring-2 focus:ring-navy focus:ring-offset-1"
                        />
                        <span
                          className={`justify-self-start rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${priorityClass(
                            task.priority,
                          )}`}
                        >
                          {task.priority}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

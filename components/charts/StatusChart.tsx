"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { EligibilityStatus } from "@/lib/types";

const STATUS_COLORS: Record<EligibilityStatus, string> = {
  ELIGIBLE: "#166534",
  NOT_ELIGIBLE: "#B91C1C",
  NEEDS_VERIFICATION: "#B45309",
};

const STATUS_LABELS: Record<EligibilityStatus, string> = {
  ELIGIBLE: "Eligible",
  NOT_ELIGIBLE: "Not eligible",
  NEEDS_VERIFICATION: "Needs verification",
};

export default function StatusChart({
  counts,
}: {
  counts: Record<EligibilityStatus, number>;
}) {
  const data = (Object.keys(STATUS_LABELS) as EligibilityStatus[]).map(
    (status) => ({
      status,
      name: STATUS_LABELS[status],
      value: counts[status],
    }),
  );
  const hasData = data.some((item) => item.value > 0);

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Eligibility
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight">
          Current status
        </h2>
      </div>
      {!hasData ? (
        <p className="flex h-64 items-center justify-center text-sm text-slate-500">
          No data yet
        </p>
      ) : (
        <div className="mt-4 h-64 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
              <CartesianGrid stroke="#E2E8F0" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fill: "#475569", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fill: "#475569", fontSize: 11 }}
                tickLine={false}
                axisLine={false}
              />
              <Tooltip />
              <Bar dataKey="value" isAnimationActive={false} radius={[4, 4, 0, 0]}>
                {data.map((item) => (
                  <Cell key={item.status} fill={STATUS_COLORS[item.status]} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

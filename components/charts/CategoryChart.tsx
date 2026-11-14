"use client";

import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";

import type { Opportunity } from "@/lib/types";

const CATEGORY_COLORS = ["#0F1D33", "#475569", "#64748B", "#94A3B8", "#CBD5E1", "#334155"];

export default function CategoryChart({
  opportunities,
}: {
  opportunities: Opportunity[];
}) {
  const data = opportunities.reduce<Array<{ name: string; value: number }>>(
    (counts, opportunity) => {
      const name = opportunity.category.replace("_", " ");
      const existing = counts.find((item) => item.name === name);
      if (existing === undefined) {
        counts.push({ name, value: 1 });
      } else {
        existing.value += 1;
      }
      return counts;
    },
    [],
  );

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.14em] text-slate-500">
          Categories
        </p>
        <h2 className="mt-2 text-xl font-bold tracking-tight">
          Opportunity mix
        </h2>
      </div>
      {data.length === 0 ? (
        <p className="flex h-64 items-center justify-center text-sm text-slate-500">
          No data yet
        </p>
      ) : (
        <div className="mt-4 h-64 min-w-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                dataKey="value"
                nameKey="name"
                innerRadius={58}
                outerRadius={88}
                paddingAngle={2}
                isAnimationActive={false}
              >
                {data.map((item, index) => (
                  <Cell
                    key={item.name}
                    fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

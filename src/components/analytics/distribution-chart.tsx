"use client";

import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend } from "recharts";
import { cn } from "@/lib/utils";

const COLORS = ["var(--color-chart-1)", "var(--color-chart-2)", "var(--color-chart-3)", "var(--color-chart-4)", "var(--color-chart-5)"];

type DistributionChartProps = {
  data: Array<{ name: string; value: number }>;
  title?: string;
  height?: number;
  className?: string;
};

export function DistributionChart({ data, title, height = 200, className }: DistributionChartProps) {
  return (
    <div className={cn("glass-surface rounded-xl p-4", className)}>
      {title && <h4 className="mb-3 text-sm font-semibold">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie data={data} cx="50%" cy="50%" innerRadius={50} outerRadius={75} paddingAngle={3} dataKey="value" animationDuration={1000} animationEasing="ease-out">
            {data.map((_, index) => (<Cell key={index} fill={COLORS[index % COLORS.length]} />))}
          </Pie>
          <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid var(--color-border)", backgroundColor: "var(--color-popover)" }} />
          <Legend iconType="circle" iconSize={8} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

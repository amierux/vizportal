"use client";

import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid } from "recharts";
import { cn } from "@/lib/utils";

type ComparisonBarProps = {
  data: Array<Record<string, unknown>>;
  bars: Array<{ dataKey: string; color: string; label?: string }>;
  xAxisKey?: string;
  title?: string;
  height?: number;
  layout?: "horizontal" | "vertical";
  className?: string;
};

export function ComparisonBar({ data, bars, xAxisKey = "name", title, height = 200, layout = "vertical", className }: ComparisonBarProps) {
  return (
    <div className={cn("glass-surface rounded-xl p-4", className)}>
      {title && <h4 className="mb-3 text-sm font-semibold">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout={layout === "horizontal" ? "vertical" : "horizontal"}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
          {layout === "horizontal" ? (
            <>
              <YAxis dataKey={xAxisKey} type="category" tick={{ fontSize: 11 }} width={80} />
              <XAxis type="number" tick={{ fontSize: 11 }} />
            </>
          ) : (
            <>
              <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} tickLine={false} />
              <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
            </>
          )}
          <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid var(--color-border)", backgroundColor: "var(--color-popover)" }} />
          {bars.map((bar) => (
            <Bar key={bar.dataKey} dataKey={bar.dataKey} fill={bar.color} radius={[4, 4, 0, 0]} animationDuration={800} animationEasing="ease-out" />
          ))}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

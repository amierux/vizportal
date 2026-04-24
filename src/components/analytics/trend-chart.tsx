"use client";

import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, Area, AreaChart } from "recharts";
import { cn } from "@/lib/utils";

type TrendChartProps = {
  data: Array<Record<string, unknown>>;
  dataKey: string;
  xAxisKey?: string;
  title?: string;
  color?: string;
  height?: number;
  type?: "line" | "area";
  className?: string;
};

export function TrendChart({ data, dataKey, xAxisKey = "date", title, color = "var(--color-chart-1)", height = 200, type = "line", className }: TrendChartProps) {
  const Chart = type === "area" ? AreaChart : LineChart;

  return (
    <div className={cn("glass-surface rounded-xl p-4", className)}>
      {title && <h4 className="mb-3 text-sm font-semibold">{title}</h4>}
      <ResponsiveContainer width="100%" height={height}>
        <Chart data={data}>
          <CartesianGrid strokeDasharray="3 3" className="opacity-20" />
          <XAxis dataKey={xAxisKey} tick={{ fontSize: 11 }} tickLine={false} />
          <YAxis tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
          <Tooltip contentStyle={{ borderRadius: "0.75rem", border: "1px solid var(--color-border)", backdropFilter: "blur(12px)", backgroundColor: "var(--color-popover)" }} />
          {type === "area" ? (
            <Area type="monotone" dataKey={dataKey} stroke={color} fill={color} fillOpacity={0.1} strokeWidth={2} animationDuration={1200} animationEasing="ease-out" />
          ) : (
            <Line type="monotone" dataKey={dataKey} stroke={color} strokeWidth={2} dot={{ fill: color, r: 3 }} activeDot={{ r: 5 }} animationDuration={1200} animationEasing="ease-out" />
          )}
        </Chart>
      </ResponsiveContainer>
    </div>
  );
}

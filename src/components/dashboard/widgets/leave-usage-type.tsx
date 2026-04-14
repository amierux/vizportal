"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type LeaveUsage = { name: string; count: number; color: string };

type Props = {
  data: LeaveUsage[];
};

const FALLBACK_COLORS = ["#6366f1", "#f59e0b", "#10b981", "#3b82f6", "#ef4444", "#8b5cf6"];

export function LeaveUsageTypeWidget({ data }: Props) {
  const chartData = data.map((d) => ({ name: d.name, value: d.count, color: d.color }));

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Leave Usage by Type</CardTitle>
      </CardHeader>
      <CardContent>
        {chartData.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={chartData} cx="50%" cy="50%" outerRadius={70} dataKey="value">
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={entry.color || FALLBACK_COLORS[index % FALLBACK_COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

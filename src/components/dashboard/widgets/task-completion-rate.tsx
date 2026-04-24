"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  ResponsiveContainer,
} from "recharts";

type Props = {
  data: { completed: number; pending: number };
};

export function TaskCompletionRateWidget({ data }: Props) {
  const chartData = [
    { name: "Completed", value: data.completed },
    { name: "Pending", value: data.pending },
  ];

  const total = data.completed + data.pending;

  return (
    <div>
      <div className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">Task Completion Rate</p>
      </div>
      <div>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">No task data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" />
              <YAxis type="category" dataKey="name" width={80} />
              <Tooltip />
              <Bar dataKey="value" radius={4}>
                <Cell fill="#22c55e" />
                <Cell fill="#94a3b8" />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

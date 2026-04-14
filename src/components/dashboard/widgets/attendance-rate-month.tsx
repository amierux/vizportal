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

type Props = {
  data: { present: number; late: number; absent: number };
};

const COLORS = ["#22c55e", "#eab308", "#ef4444"];

export function AttendanceRateMonthWidget({ data }: Props) {
  const chartData = [
    { name: "Present", value: data.present },
    { name: "Late", value: data.late },
    { name: "Absent", value: data.absent },
  ].filter((d) => d.value > 0);

  const total = data.present + data.late + data.absent;

  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Monthly Attendance Rate</CardTitle>
      </CardHeader>
      <CardContent>
        {total === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={75}
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
                labelLine={false}
              >
                {chartData.map((entry, index) => (
                  <Cell
                    key={entry.name}
                    fill={COLORS[["Present", "Late", "Absent"].indexOf(entry.name)] ?? COLORS[index % COLORS.length]}
                  />
                ))}
              </Pie>
              <Tooltip formatter={(value) => `${value}%`} />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

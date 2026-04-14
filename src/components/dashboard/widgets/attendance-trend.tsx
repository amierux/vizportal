"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type TrendPoint = { date: string; rate: number };

type Props = {
  data: TrendPoint[];
};

export function AttendanceTrendWidget({ data }: Props) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Trend (Last 30 Days)</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10 }}
                tickFormatter={(d) => d.slice(5)}
                interval="preserveStartEnd"
              />
              <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <Tooltip formatter={(value) => `${value}%`} labelFormatter={(l) => `Date: ${l}`} />
              <Line
                type="monotone"
                dataKey="rate"
                stroke="#6366f1"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

type TeamMember = { name: string; completed: number; total: number; percentage: number };

type Props = {
  data: TeamMember[];
};

export function TeamTaskProgressWidget({ data }: Props) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Team Task Progress</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={data} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} />
              <YAxis type="category" dataKey="name" width={80} tick={{ fontSize: 12 }} />
              <Tooltip formatter={(value) => `${value}%`} />
              <Bar dataKey="percentage" fill="#6366f1" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

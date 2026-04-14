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
import { formatPeso } from "@/lib/utils/payroll";

type TrendPoint = { period: string; netPay: number };

type Props = {
  data: TrendPoint[];
};

export function PayrollCostTrendWidget({ data }: Props) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Payroll Cost Trend</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No data yet.</p>
        ) : (
          <ResponsiveContainer width="100%" height={250}>
            <LineChart data={data}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} interval="preserveStartEnd" />
              <YAxis tickFormatter={(v) => `₱${(v / 1000).toFixed(0)}k`} />
              <Tooltip formatter={(value) => formatPeso(Number(value))} labelFormatter={(l) => `Period: ${l}`} />
              <Line
                type="monotone"
                dataKey="netPay"
                stroke="#22c55e"
                strokeWidth={2}
                dot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  data: { hours: number };
};

export function OvertimeMonthWidget({ data }: Props) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Overtime This Month</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{data.hours.toFixed(1)}</div>
        <div className="mt-1 text-xs text-muted-foreground">hours</div>
      </CardContent>
    </Card>
  );
}

"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  data: { count: number };
};

export function OverdueTasksWidget({ data }: Props) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Overdue Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        {data.count === 0 ? (
          <div className="text-2xl font-bold text-green-600">None overdue</div>
        ) : (
          <>
            <div className="text-2xl font-bold text-red-600">{data.count}</div>
            <div className="mt-1 text-xs text-muted-foreground">tasks overdue</div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

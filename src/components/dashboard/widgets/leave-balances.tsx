"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LeaveBalance = { code: string; name: string; remaining: number; total: number };

type Props = {
  data: LeaveBalance[];
};

export function LeaveBalancesWidget({ data }: Props) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Leave Balances</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No leave balances found.</p>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {data.map((lb) => {
              const pct = lb.total > 0 ? Math.round((lb.remaining / lb.total) * 100) : 0;
              return (
                <div key={lb.code} className="rounded-md border p-2">
                  <div className="text-xs font-semibold uppercase text-muted-foreground">{lb.code}</div>
                  <div className="mt-1 text-sm font-bold">
                    {lb.remaining}
                    <span className="font-normal text-muted-foreground"> / {lb.total}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-primary"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

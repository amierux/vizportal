"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type BalanceItem = {
  id: string;
  total_days: number;
  used_days: number;
  remaining_days: number;
  leave_types: { name: string; code: string; is_paid: boolean } | null;
};

type BalanceCardsProps = {
  balances: BalanceItem[];
};

export function BalanceCards({ balances }: BalanceCardsProps) {
  if (balances.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No leave balances allocated yet.
      </p>
    );
  }

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {balances.map((b) => {
        const pct = b.total_days > 0 ? (b.used_days / b.total_days) * 100 : 0;
        return (
          <Card key={b.id}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {b.leave_types?.name ?? "Unknown"}{" "}
                <span className="text-muted-foreground">({b.leave_types?.code})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{b.remaining_days}</div>
              <p className="text-xs text-muted-foreground">
                of {b.total_days} days remaining ({b.used_days} used)
              </p>
              <div className="mt-2 h-2 rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-primary transition-all"
                  style={{ width: `${Math.min(pct, 100)}%` }}
                />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

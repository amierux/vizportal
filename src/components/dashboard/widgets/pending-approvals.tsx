"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  data: { count: number };
};

export function PendingApprovalsWidget({ data }: Props) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Pending Approvals</CardTitle>
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${data.count > 0 ? "text-amber-600" : "text-muted-foreground"}`}>
          {data.count}
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          {data.count > 0 ? "awaiting your review" : "no pending approvals"}
        </div>
      </CardContent>
    </Card>
  );
}

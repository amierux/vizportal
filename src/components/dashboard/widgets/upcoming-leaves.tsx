"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type UpcomingLeave = { name: string; leaveType: string; startDate: string; endDate: string };

type Props = {
  data: UpcomingLeave[];
};

export function UpcomingLeavesWidget({ data }: Props) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Upcoming Leaves</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <p className="text-sm text-muted-foreground">No upcoming leaves.</p>
        ) : (
          <div className="space-y-2">
            {data.map((l, i) => (
              <div key={i} className="flex flex-col gap-0.5 rounded-md border p-2 text-sm">
                <div className="font-medium">{l.name}</div>
                <div className="text-xs text-muted-foreground">
                  {l.leaveType} &mdash; {l.startDate} to {l.endDate}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

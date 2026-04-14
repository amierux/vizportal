"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  data: { myStatus: string | null; companyPresent: number; companyLate: number; companyAbsent: number };
};

export function AttendanceTodayWidget({ data }: Props) {
  const statusLabel = data.myStatus ?? "Not clocked in";
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Today</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold capitalize">{statusLabel.replace("_", " ")}</div>
        <div className="mt-2 flex gap-3 text-xs">
          <span className="text-green-600">● {data.companyPresent} present</span>
          <span className="text-yellow-600">● {data.companyLate} late</span>
          <span className="text-red-600">● {data.companyAbsent} absent</span>
        </div>
      </CardContent>
    </Card>
  );
}

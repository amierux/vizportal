"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type Props = {
  data: { todo: number; inProgress: number; done: number };
};

export function MyTasksSummaryWidget({ data }: Props) {
  return (
    <Card className="card-hover">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">My Tasks</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex gap-4 text-sm">
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-muted-foreground">{data.todo}</span>
            <span className="text-xs text-muted-foreground">To Do</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-blue-600">{data.inProgress}</span>
            <span className="text-xs text-muted-foreground">In Progress</span>
          </div>
          <div className="flex flex-col items-center">
            <span className="text-xl font-bold text-green-600">{data.done}</span>
            <span className="text-xs text-muted-foreground">Done</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

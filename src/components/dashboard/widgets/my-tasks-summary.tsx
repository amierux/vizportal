"use client";

type Props = {
  data: { todo: number; inProgress: number; done: number };
};

export function MyTasksSummaryWidget({ data }: Props) {
  return (
    <div>
      <div className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">My Tasks</p>
      </div>
      <div>
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
      </div>
    </div>
  );
}

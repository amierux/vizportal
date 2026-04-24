"use client";

type Props = {
  data: { count: number };
};

export function OverdueTasksWidget({ data }: Props) {
  return (
    <div>
      <div className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">Overdue Tasks</p>
      </div>
      <div>
        {data.count === 0 ? (
          <div className="text-2xl font-bold text-green-600">None overdue</div>
        ) : (
          <>
            <div className="text-2xl font-bold text-red-600">{data.count}</div>
            <div className="mt-1 text-xs text-muted-foreground">tasks overdue</div>
          </>
        )}
      </div>
    </div>
  );
}

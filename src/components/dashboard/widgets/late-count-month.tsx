"use client";

type Props = {
  data: { count: number };
};

export function LateCountMonthWidget({ data }: Props) {
  const color =
    data.count > 3
      ? "text-red-600"
      : data.count > 0
        ? "text-yellow-600"
        : "text-green-600";

  return (
    <div>
      <div className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">Late Count This Month</p>
      </div>
      <div>
        <div className={`text-2xl font-bold ${color}`}>{data.count}</div>
        <div className="mt-1 text-xs text-muted-foreground">times late</div>
      </div>
    </div>
  );
}

"use client";

type Props = {
  data: { hours: number };
};

export function OvertimeMonthWidget({ data }: Props) {
  return (
    <div>
      <div className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">Overtime This Month</p>
      </div>
      <div>
        <div className="text-2xl font-bold">{data.hours.toFixed(1)}</div>
        <div className="mt-1 text-xs text-muted-foreground">hours</div>
      </div>
    </div>
  );
}

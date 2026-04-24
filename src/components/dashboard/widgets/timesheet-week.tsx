"use client";

type Props = {
  data: { loggedMinutes: number; requiredMinutes: number };
};

export function TimesheetWeekWidget({ data }: Props) {
  const loggedHrs = (data.loggedMinutes / 60).toFixed(1);
  const requiredHrs = (data.requiredMinutes / 60).toFixed(1);
  const percentage =
    data.requiredMinutes > 0
      ? Math.min(100, Math.round((data.loggedMinutes / data.requiredMinutes) * 100))
      : 0;

  const barColor =
    percentage >= 100
      ? "bg-green-500"
      : percentage >= 75
        ? "bg-yellow-500"
        : "bg-red-500";

  return (
    <div>
      <div className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">Timesheet This Week</p>
      </div>
      <div>
        <div className="text-2xl font-bold">
          {loggedHrs} <span className="text-base font-normal text-muted-foreground">/ {requiredHrs} hrs</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-muted">
          <div
            className={`h-full rounded-full ${barColor}`}
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{percentage}% logged</div>
      </div>
    </div>
  );
}

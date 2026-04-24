"use client";

type Props = {
  data: { myStatus: string | null; companyPresent: number; companyLate: number; companyAbsent: number };
};

export function AttendanceTodayWidget({ data }: Props) {
  const statusLabel = data.myStatus ?? "Not clocked in";
  return (
    <div>
      <div className="pb-2">
        <p className="text-sm font-medium text-muted-foreground">Attendance Today</p>
      </div>
      <div>
        <div className="text-2xl font-bold capitalize">{statusLabel.replace("_", " ")}</div>
        <div className="mt-2 flex gap-3 text-xs">
          <span className="text-green-600">● {data.companyPresent} present</span>
          <span className="text-yellow-600">● {data.companyLate} late</span>
          <span className="text-red-600">● {data.companyAbsent} absent</span>
        </div>
      </div>
    </div>
  );
}

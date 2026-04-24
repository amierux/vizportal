import { getMonthlyAttendanceReport } from "@/lib/actions/attendance";
import { AttendanceSummaryTable } from "@/components/attendance/attendance-summary-table";
import { formatFullName } from "@/lib/utils/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ [key: string]: string | undefined }>;

export default async function AttendanceReportsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const now = new Date();
  const year = Number(params.year) || now.getFullYear();
  const month = Number(params.month) || now.getMonth() + 1;
  const departmentId = params.department_id;

  const rawData = await getMonthlyAttendanceReport({
    year,
    month,
    departmentId: departmentId || undefined,
  });

  // Aggregate per employee
  const employeeMap = new Map<
    string,
    {
      profileId: string;
      name: string;
      department: string;
      daysPresent: number;
      lateCount: number;
      totalLateMinutes: number;
      undertimeHours: number;
      overtimeHours: number;
      absences: number;
    }
  >();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  for (const row of rawData as any[]) {
    const pid = row.profiles?.id ?? row.profile_id;
    if (!employeeMap.has(pid)) {
      employeeMap.set(pid, {
        profileId: pid,
        name: row.profiles
          ? formatFullName(row.profiles.first_name, row.profiles.last_name)
          : "Unknown",
        department:
          row.profiles?.employee_details?.departments?.name ?? "—",
        daysPresent: 0,
        lateCount: 0,
        totalLateMinutes: 0,
        undertimeHours: 0,
        overtimeHours: 0,
        absences: 0,
      });
    }
    const emp = employeeMap.get(pid)!;
    if (row.status === "present" || row.status === "late") emp.daysPresent++;
    if (row.is_late) {
      emp.lateCount++;
      emp.totalLateMinutes += row.late_minutes;
    }
    emp.undertimeHours += row.undertime_minutes / 60;
    emp.overtimeHours += row.overtime_minutes / 60;
    if (row.status === "absent") emp.absences++;
  }

  const summaryRows = Array.from(employeeMap.values());

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Attendance Reports</h1>
      <p className="text-muted-foreground">
        {new Date(year, month - 1).toLocaleDateString("en-US", {
          month: "long",
          year: "numeric",
        })}
      </p>
      <AttendanceSummaryTable rows={summaryRows} />
    </div>
  );
}

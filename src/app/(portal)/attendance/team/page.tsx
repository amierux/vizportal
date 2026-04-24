import { getTeamAttendanceToday } from "@/lib/actions/attendance";
import { AttendanceTable } from "@/components/attendance/attendance-table";

export const dynamic = "force-dynamic";

export default async function TeamAttendancePage() {
  const teamData = await getTeamAttendanceToday();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Team Attendance</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <AttendanceTable rows={teamData as any} />
    </div>
  );
}

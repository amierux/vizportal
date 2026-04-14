import { getTeamAttendanceToday } from "@/lib/actions/attendance";
import { AttendanceTable } from "@/components/attendance/attendance-table";

export default async function TeamAttendancePage() {
  const teamData = await getTeamAttendanceToday();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Team Attendance</h1>
      <AttendanceTable rows={teamData as any} />
    </div>
  );
}

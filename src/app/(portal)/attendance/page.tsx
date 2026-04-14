import { createClient } from "@/lib/supabase/server";
import { getTodayClockStatus } from "@/lib/actions/attendance";
import { LiveClock } from "@/components/attendance/live-clock";
import { ClockButton } from "@/components/attendance/clock-button";
import { TodaySessions } from "@/components/attendance/today-sessions";
import { AttendanceCalendar } from "@/components/attendance/attendance-calendar";
import { ManualClockDialog } from "@/components/attendance/manual-clock-dialog";
import { AttendanceRecords } from "@/components/attendance/attendance-records";
import { Separator } from "@/components/ui/separator";
import type { RoleName } from "@/types";

export default async function AttendancePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const clockStatus = await getTodayClockStatus();

  // Get monthly summaries for calendar
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    .toISOString()
    .split("T")[0];

  const { data: summaries } = await supabase
    .from("daily_attendance_summary")
    .select("*")
    .eq("profile_id", user.id)
    .gte("date", startDate)
    .lte("date", endDate);

  // Get user roles for records tabs
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("profile_id", user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles: RoleName[] = (userRoles ?? []).map((ur: any) => ur.roles.name);

  // Get departments for filter
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("name");

  const requiredHours = clockStatus?.schedule
    ? (() => {
        const [sH, sM] = clockStatus.schedule.start_time
          .split(":")
          .map(Number);
        const [eH, eM] = clockStatus.schedule.end_time.split(":").map(Number);
        return eH + eM / 60 - (sH + sM / 60);
      })()
    : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Attendance</h1>
        <ManualClockDialog />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-6">
          <div className="rounded-lg border p-6">
            <LiveClock />
            <div className="mt-6">
              <ClockButton
                isClockedIn={clockStatus?.isClockedIn ?? false}
                companyId={profile.company_id}
                profileId={user.id}
              />
            </div>
          </div>

          <TodaySessions
            entries={clockStatus?.entries ?? []}
            requiredHours={requiredHours}
          />
        </div>

        <AttendanceCalendar
          summaries={summaries ?? []}
          workDays={clockStatus?.schedule?.work_days}
        />
      </div>

      <Separator />
      <AttendanceRecords userRoles={roles} departments={departments ?? []} />
    </div>
  );
}

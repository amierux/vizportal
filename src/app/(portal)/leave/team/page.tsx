import { getTeamLeaves } from "@/lib/actions/leave";
import { LeaveCalendar } from "@/components/leave/leave-calendar";

export const dynamic = "force-dynamic";

export default async function TeamLeavePage() {
  // Show 3 months: previous, current, next
  const now = new Date();
  const startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString().split("T")[0];
  const endDate = new Date(now.getFullYear(), now.getMonth() + 2, 0).toISOString().split("T")[0];

  const leaves = await getTeamLeaves({ startDate, endDate });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Team Leave Calendar</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <LeaveCalendar leaves={leaves as any} />
    </div>
  );
}

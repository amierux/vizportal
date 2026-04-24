import { createClient } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/actions/helpers";
import { getTimesheetEntries } from "@/lib/actions/workspace-time-entries";
import { TimesheetDetailView } from "@/components/timesheet/timesheet-detail-view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Params = Promise<{ submissionId: string }>;

export default async function TimesheetDetailPage({ params }: { params: Params }) {
  const { submissionId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const roles = await getUserRoles();

  const { data: submission } = await supabase
    .from("timesheet_submissions")
    .select(`
      *,
      profiles:profile_id(id, first_name, last_name, email,
        employee_details(department_id, departments(name))
      )
    `)
    .eq("id", submissionId)
    .single();

  if (!submission) redirect("/timesheet");

  // Fetch the actual time entries for this week
  const entries = await getTimesheetEntries(
    (submission as any).profile_id,
    (submission as any).week_start_date,
    (submission as any).week_end_date,
  );

  return (
    <TimesheetDetailView
      submission={submission as any}
      entries={entries as any}
      roles={roles}
      currentUserId={user.id}
    />
  );
}

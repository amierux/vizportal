import { createClient } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/actions/helpers";
import { AttendanceDetailView } from "@/components/attendance/attendance-detail-view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Params = Promise<{ summaryId: string }>;

export default async function AttendanceDetailPage({ params }: { params: Params }) {
  const { summaryId } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const roles = await getUserRoles();

  const { data: summary } = await supabase
    .from("daily_attendance_summary")
    .select(`
      *,
      profiles:profile_id(id, first_name, last_name, email,
        employee_details(department_id, departments(name))
      )
    `)
    .eq("id", summaryId)
    .single();

  if (!summary) redirect("/attendance/manage");

  // Fetch clock entries for this day
  const { data: clockEntries } = await supabase
    .from("clock_entries")
    .select("id, type, timestamp, selfie_url, is_manual, latitude, longitude, attachment_url")
    .eq("profile_id", (summary as any).profile_id)
    .eq("date", (summary as any).date)
    .order("timestamp", { ascending: true });

  return (
    <AttendanceDetailView
      summary={summary as any}
      clockEntries={clockEntries ?? []}
      roles={roles}
    />
  );
}

import { getMyOvertimeRequests, getOvertimeRecords } from "@/lib/actions/overtime";
import { fetchOvertimeAnalytics } from "@/lib/actions/analytics";
import { getUserProfile, getUserRoles } from "@/lib/actions/helpers";
import { createClient } from "@/lib/supabase/server";
import { OvertimePageClient } from "@/components/overtime/overtime-page-client";

export const dynamic = "force-dynamic";

export default async function OvertimePage() {
  const [roles, profile] = await Promise.all([getUserRoles(), getUserProfile()]);
  if (!profile) return null;

  const supabase = await createClient();
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("name");

  const isAdminLevel = roles.some((r) =>
    ["admin", "hr", "business_manager", "director", "dept_manager", "team_leader"].includes(r)
  );

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split("T")[0];
  const today = now.toISOString().split("T")[0];

  const [myRequests, analyticsData] = await Promise.all([
    getMyOvertimeRequests(),
    isAdminLevel ? fetchOvertimeAnalytics() : null,
  ]);

  return (
    <OvertimePageClient
      myRequests={myRequests as any}
      analyticsData={analyticsData}
      roles={roles}
      departments={departments ?? []}
      isAdminLevel={isAdminLevel}
    />
  );
}

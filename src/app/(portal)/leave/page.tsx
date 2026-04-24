import { getMyLeaveRequests } from "@/lib/actions/leave";
import { getLeaveTypes } from "@/lib/actions/leave-types";
import { fetchLeaveAnalytics } from "@/lib/actions/analytics";
import { getUserProfile, getUserRoles } from "@/lib/actions/helpers";
import { createClient } from "@/lib/supabase/server";
import { LeavePageClient } from "@/components/leave/leave-page-client";

export const dynamic = "force-dynamic";

export default async function LeavePage() {
  const [roles, profile] = await Promise.all([getUserRoles(), getUserProfile()]);
  if (!profile) return null;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("name");

  const isAdminLevel = roles.some((r) =>
    ["admin", "hr", "business_manager", "director", "dept_manager", "team_leader"].includes(r)
  );

  const [myRequests, leaveTypes, analyticsData] = await Promise.all([
    getMyLeaveRequests(),
    getLeaveTypes(),
    isAdminLevel ? fetchLeaveAnalytics() : null,
  ]);

  const { data: activeProfiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("company_id", profile.company_id)
    .eq("is_active", true)
    .neq("id", user.id)
    .order("first_name");

  return (
    <LeavePageClient
      myRequests={myRequests as any}
      analyticsData={analyticsData}
      roles={roles}
      departments={departments ?? []}
      isAdminLevel={isAdminLevel}
      leaveTypes={leaveTypes as any}
      activeProfiles={activeProfiles ?? []}
    />
  );
}

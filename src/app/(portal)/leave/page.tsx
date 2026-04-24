import { getMyLeaveBalances, getMyLeaveRequests } from "@/lib/actions/leave";
import { getLeaveTypes } from "@/lib/actions/leave-types";
import { BalanceCards } from "@/components/leave/balance-cards";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { LeaveRequestsTable } from "@/components/leave/leave-requests-table";
import { createClient } from "@/lib/supabase/server";
import { LeaveRecords } from "@/components/leave/leave-records";
import { Separator } from "@/components/ui/separator";
import type { RoleName } from "@/types";

export default async function LeavePage() {
  const [balances, requests, leaveTypes] = await Promise.all([
    getMyLeaveBalances(),
    getMyLeaveRequests(),
    getLeaveTypes(),
  ]);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user!.id)
    .single();

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("profile_id", user!.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles: RoleName[] = (userRoles ?? []).map((ur: any) => ur.roles.name);

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", profile!.company_id)
    .order("name");

  const { data: activeProfiles } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("company_id", profile!.company_id)
    .eq("is_active", true)
    .neq("id", user!.id)
    .order("first_name");

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Leave</h1>
        <LeaveRequestForm leaveTypes={leaveTypes} users={activeProfiles ?? []} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div>
          <h2 className="mb-3 text-lg font-semibold">Leave Balances</h2>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <BalanceCards balances={balances as any} />
        </div>

        <div>
          <h2 className="mb-3 text-lg font-semibold">My Requests</h2>
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <LeaveRequestsTable requests={requests as any} />
        </div>
      </div>

      <Separator />
      <LeaveRecords userRoles={roles} departments={departments ?? []} />
    </div>
  );
}

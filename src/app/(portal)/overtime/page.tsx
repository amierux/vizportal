import { getMyOvertimeRequests } from "@/lib/actions/overtime";
import { fetchOvertimeAnalytics } from "@/lib/actions/analytics";
import { OvertimeRequestForm } from "@/components/overtime/overtime-request-form";
import { OvertimeRequestsTable } from "@/components/overtime/overtime-requests-table";
import { OvertimeRecords } from "@/components/overtime/overtime-records";
import { OvertimeAnalytics } from "@/components/overtime/overtime-analytics";
import { createClient } from "@/lib/supabase/server";
import { Separator } from "@/components/ui/separator";
import type { RoleName } from "@/types";

export default async function OvertimePage() {
  const [requests, analyticsData] = await Promise.all([
    getMyOvertimeRequests(),
    fetchOvertimeAnalytics(),
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Overtime</h1>
        <OvertimeRequestForm />
      </div>

      <OvertimeAnalytics data={analyticsData} />

      <div>
        <h2 className="mb-3 text-lg font-semibold">My Requests</h2>
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <OvertimeRequestsTable requests={requests as any} />
      </div>

      <Separator />
      <OvertimeRecords userRoles={roles} departments={departments ?? []} />
    </div>
  );
}

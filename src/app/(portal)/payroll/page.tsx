import { createClient } from "@/lib/supabase/server";
import { getMyPayrollEntries, getPayrollPeriods, getPayrollEntries, getLatestDraftPeriod } from "@/lib/actions/payroll";
import { fetchPayrollAnalytics } from "@/lib/actions/analytics";
import { MyPayrollTable } from "@/components/payroll/my-payroll-table";
import { AllPayrollTable } from "@/components/payroll/all-payroll-table";
import { ProcessPayrollButton } from "@/components/payroll/process-payroll-button";
import { PayrollAnalytics } from "@/components/payroll/payroll-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import type { RoleName } from "@/types";

export const dynamic = "force-dynamic";

export default async function PayrollPage() {
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

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("profile_id", user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles: RoleName[] = (userRoles ?? []).map((ur: any) => ur.roles.name);

  const isAdminLevel = roles.some((r) =>
    ["admin", "hr", "business_manager", "director"].includes(r)
  );

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .order("name");

  // Fetch my entries and period info
  const [myEntries, periods, draftPeriod] = await Promise.all([
    getMyPayrollEntries(),
    isAdminLevel ? getPayrollPeriods() : Promise.resolve([]),
    isAdminLevel ? getLatestDraftPeriod() : Promise.resolve(null),
  ]);

  // Fetch all entries for the latest period (admin only)
  const latestPeriod = periods[0] ?? null;
  const allEntries = isAdminLevel && latestPeriod
    ? await getPayrollEntries(latestPeriod.id)
    : [];

  const hasActivePeriod = !!draftPeriod;
  const analyticsData = isAdminLevel ? await fetchPayrollAnalytics() : null;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Payroll</h1>
          <p className="text-muted-foreground text-sm">
            View your payslips and payroll history
          </p>
        </div>
        {isAdminLevel && (
          <ProcessPayrollButton hasActivePeriod={hasActivePeriod} />
        )}
      </div>

      <Separator />

      <PayrollAnalytics data={analyticsData} />

      {isAdminLevel ? (
        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my">My Payroll</TabsTrigger>
            <TabsTrigger value="all">All Members</TabsTrigger>
          </TabsList>
          <TabsContent value="my" className="animate-fade-in mt-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <MyPayrollTable entries={myEntries as any[]} />
          </TabsContent>
          <TabsContent value="all" className="animate-fade-in mt-4">
            <AllPayrollTable
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              entries={allEntries as any[]}
              departments={departments ?? []}
            />
          </TabsContent>
        </Tabs>
      ) : (
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <MyPayrollTable entries={myEntries as any[]} />
      )}
    </div>
  );
}

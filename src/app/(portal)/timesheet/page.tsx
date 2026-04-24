import { createClient } from "@/lib/supabase/server";
import { getWeeklyTimesheet, getAllTimesheetSubmissions } from "@/lib/actions/timesheet";
import { fetchTimesheetAnalytics } from "@/lib/actions/analytics";
import { TimesheetWeeklyGrid } from "@/components/timesheet/timesheet-weekly-grid";
import { TimesheetSubmission } from "@/components/timesheet/timesheet-submission";
import { TimesheetAllMembers } from "@/components/timesheet/timesheet-all-members";
import { TimesheetAnalytics } from "@/components/timesheet/timesheet-analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { buttonVariants } from "@/components/ui/button";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleName } from "@/types";

export const dynamic = "force-dynamic";

function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  return d;
}

function formatWeekStart(date: Date): string {
  return date.toISOString().split("T")[0];
}

function offsetWeek(weekStart: string, offset: number): string {
  const d = new Date(weekStart);
  d.setDate(d.getDate() + offset * 7);
  return d.toISOString().split("T")[0];
}

type Props = {
  searchParams: Promise<{ week?: string }>;
};

function WeekNav({ weekStartDate, prevWeek, nextWeek, isCurrentWeek }: {
  weekStartDate: string; prevWeek: string; nextWeek: string; isCurrentWeek: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <Link
        href={`/timesheet?week=${prevWeek}`}
        className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8")}
      >
        <ChevronLeft className="w-4 h-4" />
      </Link>
      <span className="text-sm font-medium px-1">Week of {weekStartDate}</span>
      {isCurrentWeek ? (
        <span className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8 pointer-events-none opacity-50")}>
          <ChevronRight className="w-4 h-4" />
        </span>
      ) : (
        <Link
          href={`/timesheet?week=${nextWeek}`}
          className={cn(buttonVariants({ variant: "outline", size: "icon" }), "h-8 w-8")}
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      )}
    </div>
  );
}

export default async function TimesheetPage({ searchParams }: Props) {
  const { week } = await searchParams;

  const today = new Date();
  const currentMonday = getMonday(today);
  const weekStartDate = week ?? formatWeekStart(currentMonday);

  const prevWeek = offsetWeek(weekStartDate, -1);
  const nextWeek = offsetWeek(weekStartDate, 1);
  const isCurrentWeek = weekStartDate === formatWeekStart(currentMonday);

  // Auth
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return null;

  // Roles
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("profile_id", user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles: RoleName[] = (userRoles ?? []).map((ur: any) => ur.roles.name);

  const isAdminLevel = roles.some((r) =>
    ["admin", "hr", "business_manager", "director"].includes(r)
  );

  // My timesheet data
  const { entries, submission } = await getWeeklyTimesheet(weekStartDate);

  // All submissions + departments (admin only)
  const [allSubmissions, departments, analyticsData] = await Promise.all([
    isAdminLevel ? getAllTimesheetSubmissions({}) : Promise.resolve([]),
    isAdminLevel
      ? supabase
          .from("departments")
          .select("id, name")
          .eq("company_id", profile.company_id)
          .order("name")
          .then(({ data }) => data ?? [])
      : Promise.resolve([]),
    isAdminLevel ? fetchTimesheetAnalytics() : Promise.resolve(null),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Timesheet</h1>
        <p className="text-muted-foreground text-sm">Track and submit your weekly hours</p>
      </div>

      <TimesheetAnalytics data={analyticsData} />

      <Separator />

      {isAdminLevel ? (
        <Tabs defaultValue="my">
          <TabsList>
            <TabsTrigger value="my">My Timesheet</TabsTrigger>
            <TabsTrigger value="all">All Members</TabsTrigger>
          </TabsList>

          <TabsContent value="my" className="animate-fade-in mt-4 space-y-4">
            <WeekNav weekStartDate={weekStartDate} prevWeek={prevWeek} nextWeek={nextWeek} isCurrentWeek={isCurrentWeek} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <TimesheetSubmission submission={submission as any} weekStartDate={weekStartDate} />
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <TimesheetWeeklyGrid entries={entries as any[]} submission={submission as any} weekStartDate={weekStartDate} />
          </TabsContent>

          <TabsContent value="all" className="animate-fade-in mt-4">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <TimesheetAllMembers submissions={allSubmissions as any[]} departments={departments} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          <WeekNav weekStartDate={weekStartDate} prevWeek={prevWeek} nextWeek={nextWeek} isCurrentWeek={isCurrentWeek} />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <TimesheetSubmission submission={submission as any} weekStartDate={weekStartDate} />
          {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
          <TimesheetWeeklyGrid entries={entries as any[]} submission={submission as any} weekStartDate={weekStartDate} />
        </div>
      )}
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { getAttendanceSummaries } from "@/lib/actions/attendance";
import { SGT_TIMEZONE } from "@/lib/constants";
import { fetchAttendanceAnalytics } from "@/lib/actions/analytics";
import { AttendanceManageClient } from "@/components/attendance/attendance-manage-client";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ [key: string]: string | undefined }>;

export default async function AttendanceManagePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const date =
    params.date ??
    new Date().toLocaleDateString("en-CA", { timeZone: SGT_TIMEZONE });
  const departmentId = params.department_id ?? "";
  const status = params.status ?? "";
  const page = Number(params.page) || 1;

  const { data } = await getAttendanceSummaries({
    date,
    departmentId: departmentId || undefined,
    status: status || undefined,
    page,
  });

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user!.id)
    .single();

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", profile!.company_id)
    .order("name");

  const analyticsData = await fetchAttendanceAnalytics();

  return (
    <AttendanceManageClient
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      initialRows={(data as any) ?? []}
      initialDate={date}
      departments={departments ?? []}
      analyticsData={analyticsData}
    />
  );
}

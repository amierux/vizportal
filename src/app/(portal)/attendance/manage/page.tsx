import { createClient } from "@/lib/supabase/server";
import { getAttendanceSummaries } from "@/lib/actions/attendance";
import { AttendanceTable } from "@/components/attendance/attendance-table";
import { SGT_TIMEZONE } from "@/lib/constants";

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data, count } = await getAttendanceSummaries({
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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", profile!.company_id)
    .order("name");

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Attendance Management</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <AttendanceTable rows={data as any} />
    </div>
  );
}

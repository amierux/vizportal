import { getLeaveRequests } from "@/lib/actions/leave";
import { getLeaveTypes } from "@/lib/actions/leave-types";
import { fetchLeaveAnalytics } from "@/lib/actions/analytics";
import { LeaveRequestsTable } from "@/components/leave/leave-requests-table";
import { LeaveAnalytics } from "@/components/leave/leave-analytics";

type SearchParams = Promise<{ [key: string]: string | undefined }>;

export default async function LeaveManagePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = params.status ?? "";
  const departmentId = params.department_id ?? "";

  const [{ data: requests }, leaveTypes, analyticsData] = await Promise.all([
    getLeaveRequests({
      status: status || undefined,
      departmentId: departmentId || undefined,
    }),
    getLeaveTypes(),
    fetchLeaveAnalytics(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Leave Management</h1>
      <LeaveAnalytics data={analyticsData} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <LeaveRequestsTable requests={requests as any} showEmployee />
    </div>
  );
}

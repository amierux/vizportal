import { getLeaveRequests, getAllLeaveBalances } from "@/lib/actions/leave";
import { getLeaveTypes } from "@/lib/actions/leave-types";
import { LeaveRequestsTable } from "@/components/leave/leave-requests-table";

type SearchParams = Promise<{ [key: string]: string | undefined }>;

export default async function LeaveManagePage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const status = params.status ?? "";
  const departmentId = params.department_id ?? "";

  const [requests, leaveTypes] = await Promise.all([
    getLeaveRequests({
      status: status || undefined,
      departmentId: departmentId || undefined,
    }),
    getLeaveTypes(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Leave Management</h1>
      <LeaveRequestsTable requests={requests as any} showEmployee />
    </div>
  );
}

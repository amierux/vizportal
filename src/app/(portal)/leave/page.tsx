import { getMyLeaveBalances, getMyLeaveRequests } from "@/lib/actions/leave";
import { getLeaveTypes } from "@/lib/actions/leave-types";
import { BalanceCards } from "@/components/leave/balance-cards";
import { LeaveRequestForm } from "@/components/leave/leave-request-form";
import { LeaveRequestsTable } from "@/components/leave/leave-requests-table";

export default async function LeavePage() {
  const [balances, requests, leaveTypes] = await Promise.all([
    getMyLeaveBalances(),
    getMyLeaveRequests(),
    getLeaveTypes(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Leave</h1>
        <LeaveRequestForm leaveTypes={leaveTypes} />
      </div>

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
  );
}

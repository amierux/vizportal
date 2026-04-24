import { getMyPendingApprovals } from "@/lib/actions/approvals";
import { fetchApprovalAnalytics } from "@/lib/actions/analytics";
import { ApprovalInbox } from "@/components/approvals/approval-inbox";
import { ApprovalAnalytics } from "@/components/approvals/approval-analytics";

export const dynamic = "force-dynamic";

export default async function ApprovalsPage() {
  const pendingApprovals = await getMyPendingApprovals();
  const analyticsData = await fetchApprovalAnalytics();

  return (
    <div>
      <ApprovalAnalytics data={analyticsData} />
      <ApprovalInbox approvals={pendingApprovals} />
    </div>
  );
}

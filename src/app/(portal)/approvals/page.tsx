import { getMyPendingApprovals } from "@/lib/actions/approvals";
import { ApprovalInbox } from "@/components/approvals/approval-inbox";

export default async function ApprovalsPage() {
  const pendingApprovals = await getMyPendingApprovals();

  return (
    <div>
      <ApprovalInbox approvals={pendingApprovals} />
    </div>
  );
}

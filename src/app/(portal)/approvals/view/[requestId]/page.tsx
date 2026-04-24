import { getApprovalStepDetail } from "@/lib/actions/approvals";
import { ApprovalDetailView } from "@/components/approvals/approval-detail-view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Params = Promise<{ requestId: string }>;

export default async function ApprovalDetailPage({ params }: { params: Params }) {
  const { requestId } = await params;

  const detail = await getApprovalStepDetail(requestId);
  if (!detail) redirect("/approvals");

  return (
    <ApprovalDetailView
      step={detail.step}
      request={detail.request}
      allSteps={detail.allSteps}
      referenceDetails={detail.referenceDetails}
    />
  );
}

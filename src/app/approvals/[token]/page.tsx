import { getApprovalByToken } from "@/lib/actions/approvals";
import { ApprovalPublicPage } from "@/components/approvals/approval-public-page";
import { notFound } from "next/navigation";

export const dynamic = "force-dynamic";

type Params = Promise<{ token: string }>;

export default async function ApprovalTokenPage({
  params,
}: {
  params: Params;
}) {
  const { token } = await params;
  const result = await getApprovalByToken(token);

  if (!result) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-lg">
        <ApprovalPublicPage
          step={result.step}
          referenceDetails={result.referenceDetails}
          token={token}
        />
      </div>
    </div>
  );
}

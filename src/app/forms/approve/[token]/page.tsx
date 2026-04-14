import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { FormApprovalPublicPage } from "@/components/forms/form-approval-public-page";

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

type Params = Promise<{ token: string }>;

export default async function FormApprovePage({ params }: { params: Params }) {
  const { token } = await params;
  const supabase = getAdminClient();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: step } = await (supabase as any)
    .from("form_submission_approval_steps")
    .select(`
      id, approver_name, approver_email, status, comment, decided_at,
      form_submission_approvals(
        id,
        form_submissions(
          id, respondent_name, respondent_email, data,
          forms(id, name, description,
            form_sections(*, form_fields(*))
          )
        )
      )
    `)
    .eq("token", token)
    .single();

  if (!step) notFound();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-2xl">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <FormApprovalPublicPage step={step as any} token={token} />
      </div>
    </div>
  );
}

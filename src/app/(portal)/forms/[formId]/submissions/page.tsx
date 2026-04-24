import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getForm } from "@/lib/actions/forms";
import { getFormSubmissions } from "@/lib/actions/form-submissions";
import { SubmissionsTable } from "@/components/forms/submissions-table";
import type { RoleName } from "@/types";

type Params = Promise<{ formId: string }>;

const ADMIN_ROLES: RoleName[] = ["admin", "hr"];

export default async function FormSubmissionsPage({ params }: { params: Params }) {
  const { formId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Enforce admin/HR access
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("profile_id", user.id);

  const roles: RoleName[] = (userRoles ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ur: any) => ur.roles.name
  );

  if (!roles.some((r) => ADMIN_ROLES.includes(r))) redirect("/forms/my-forms");

  const [form, submissions] = await Promise.all([
    getForm(formId),
    getFormSubmissions(formId),
  ]);

  if (!form) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Submissions — {form.name}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All responses submitted for this form.
        </p>
      </div>
      <SubmissionsTable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        submissions={submissions as any}
        formName={form.name}
        formId={formId}
      />
    </div>
  );
}

import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getForm } from "@/lib/actions/forms";
import { FormBuilder } from "@/components/forms/form-builder";
import type { RoleName } from "@/types";

type Params = Promise<{ formId: string }>;

export default async function FormBuilderPage({ params }: { params: Params }) {
  const { formId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Require admin role
  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("profile_id", user.id);

  const roles: RoleName[] = (userRoles ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ur: any) => ur.roles.name
  );

  if (!roles.includes("admin")) redirect("/forms");

  // Fetch form with sections + fields
  const form = await getForm(formId);
  if (!form) notFound();

  // Fetch current user's profile for company_id
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const companyId = profile?.company_id ?? null;

  // Fetch workspace lists scoped to company (for save-to-list selector)
  const workspaceListsResult = companyId
    ? await supabase
        .from("workspace_lists")
        .select("id, name, folder_id")
        .eq("company_id", companyId)
        .order("name")
    : { data: [] };

  const workspaceLists = workspaceListsResult.data ?? [];

  // Fetch departments for schedule target
  const departmentsResult = companyId
    ? await supabase
        .from("departments")
        .select("id, name")
        .eq("company_id", companyId)
        .order("name")
    : { data: [] };

  const departments = departmentsResult.data ?? [];

  // Fetch active profiles for specific-target schedule
  const profilesResult = companyId
    ? await supabase
        .from("profiles")
        .select("id, first_name, last_name, email")
        .eq("company_id", companyId)
        .eq("is_active", true)
        .order("first_name")
    : { data: [] };

  const profiles = profilesResult.data ?? [];

  return (
    <div className="animate-fade-in-up">
      <FormBuilder
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        form={form as any}
        workspaceLists={workspaceLists}
        departments={departments}
        profiles={profiles}
      />
    </div>
  );
}

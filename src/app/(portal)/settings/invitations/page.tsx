import { createClient } from "@/lib/supabase/server";
import { InvitationForm } from "@/components/settings/invitation-form";

export default async function InvitationsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user!.id)
    .single();

  const [invitations, departments, jobLevels, roles] = await Promise.all([
    supabase
      .from("invitations")
      .select("*")
      .eq("company_id", profile!.company_id)
      .order("created_at", { ascending: false }),
    supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", profile!.company_id)
      .order("name"),
    supabase
      .from("job_levels")
      .select("id, code, name")
      .eq("company_id", profile!.company_id)
      .order("rank"),
    supabase
      .from("roles")
      .select("id, name")
      .eq("company_id", profile!.company_id)
      .order("name"),
  ]);

  return (
    <div>
      <InvitationForm
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        invitations={(invitations.data as any) ?? []}
        departments={departments.data ?? []}
        jobLevels={jobLevels.data ?? []}
        roles={roles.data ?? []}
      />
    </div>
  );
}

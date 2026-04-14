import { createClient } from "@/lib/supabase/server";
import { RoleTable } from "@/components/settings/role-table";

export default async function RolesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user!.id)
    .single();
  const { data: roles } = await supabase
    .from("roles")
    .select("*")
    .eq("company_id", profile!.company_id)
    .order("name");

  return (
    <div className="animate-fade-in-up">
      <RoleTable roles={roles ?? []} />
    </div>
  );
}

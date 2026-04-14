import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { DepartmentList } from "@/components/company/department-list";

export default async function DepartmentsSettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) redirect("/login");

  const { data: departments } = await supabase
    .from("departments")
    .select("*")
    .eq("company_id", profile.company_id)
    .order("name");

  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("company_id", profile.company_id)
    .eq("is_active", true)
    .order("first_name");

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Departments</h1>
      <DepartmentList departments={departments ?? []} members={members ?? []} />
    </div>
  );
}

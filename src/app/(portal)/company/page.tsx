import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "@/components/company/company-form";
import { DepartmentList } from "@/components/company/department-list";
import { Separator } from "@/components/ui/separator";

export default async function CompanyPage() {
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

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .single();
  if (!company) redirect("/dashboard");

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
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold">General</h2>
        <p className="text-sm text-muted-foreground">
          Manage your company information and leadership
        </p>
      </div>
      <CompanyForm company={company} members={members ?? []} />
      <Separator />
      <DepartmentList departments={departments ?? []} members={members ?? []} />
    </div>
  );
}

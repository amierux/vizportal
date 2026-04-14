import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanyForm } from "@/components/company/company-form";

export default async function CompanySettingsPage() {
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

  const { data: members } = await supabase
    .from("profiles")
    .select("id, first_name, last_name")
    .eq("company_id", profile.company_id)
    .eq("is_active", true)
    .order("first_name");

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h2 className="text-xl font-semibold">Company Information</h2>
        <p className="text-sm text-muted-foreground">
          Manage your company details, logo, and favicon
        </p>
      </div>
      <CompanyForm company={company} members={members ?? []} />
    </div>
  );
}

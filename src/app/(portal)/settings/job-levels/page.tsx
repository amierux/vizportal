import { createClient } from "@/lib/supabase/server";
import { JobLevelTable } from "@/components/settings/job-level-table";

export default async function JobLevelsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user!.id)
    .single();
  const { data: jobLevels } = await supabase
    .from("job_levels")
    .select("*")
    .eq("company_id", profile!.company_id)
    .order("rank");

  return (
    <div className="animate-fade-in-up">
      <JobLevelTable jobLevels={jobLevels ?? []} />
    </div>
  );
}

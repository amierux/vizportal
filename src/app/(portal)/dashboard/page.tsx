import { createClient } from "@/lib/supabase/server";
import { formatFullName } from "@/lib/utils/format";

export default async function DashboardPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("first_name, last_name")
    .eq("id", user!.id)
    .single();

  const name = profile
    ? formatFullName(profile.first_name, profile.last_name)
    : "there";

  return (
    <div className="animate-fade-in-up">
      <h2 className="text-2xl font-bold">Welcome, {name}</h2>
      <p className="mt-2 text-muted-foreground">
        This is your VizPortal dashboard. More analytics coming in Phase 4.
      </p>
    </div>
  );
}

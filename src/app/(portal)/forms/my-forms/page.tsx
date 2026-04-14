import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getMyAssignedForms } from "@/lib/actions/forms";
import { getMyFormSubmissions } from "@/lib/actions/form-submissions";
import { MyFormsList } from "@/components/forms/my-forms-list";

export default async function MyFormsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [assignments, mySubmissions] = await Promise.all([
    getMyAssignedForms(),
    getMyFormSubmissions(),
  ]);

  return (
    <div className="animate-fade-in-up space-y-4">
      <div>
        <h1 className="text-2xl font-bold">My Forms</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Forms assigned to you and your past submissions.
        </p>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <MyFormsList assignments={assignments as any} mySubmissions={mySubmissions as any} />
    </div>
  );
}

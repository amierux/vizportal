import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getForms } from "@/lib/actions/forms";
import { FormListTable } from "@/components/forms/form-list-table";

export default async function FormsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const forms = await getForms();

  return (
    <div className="animate-fade-in-up space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Forms</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Create and manage forms for your team.
        </p>
      </div>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <FormListTable forms={forms as any} />
    </div>
  );
}

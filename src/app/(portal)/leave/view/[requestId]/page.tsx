import { createClient } from "@/lib/supabase/server";
import { getUserRoles } from "@/lib/actions/helpers";
import { LeaveDetailView } from "@/components/leave/leave-detail-view";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

type Params = Promise<{ requestId: string }>;

export default async function LeaveDetailPage({ params }: { params: Params }) {
  const { requestId } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const roles = await getUserRoles();

  const { data: request } = await supabase
    .from("leave_requests")
    .select(`
      *,
      leave_types(name, code),
      profiles:profile_id(id, first_name, last_name, email,
        employee_details(department_id, departments(name))
      )
    `)
    .eq("id", requestId)
    .single();

  if (!request) redirect("/leave");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return <LeaveDetailView request={request as any} roles={roles} currentUserId={user.id} />;
}

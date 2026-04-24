import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getMyTasks } from "@/lib/actions/workspace-tasks";
import { fetchWorkspaceAnalytics } from "@/lib/actions/analytics";
import { MyTasksView } from "@/components/workspace/my-tasks-view";
import { WorkspaceAnalytics } from "@/components/workspace/workspace-analytics";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [tasks, analyticsData] = await Promise.all([
    getMyTasks(),
    fetchWorkspaceAnalytics(),
  ]);

  const statusMap: Record<string, { name: string; color: string }> = {};

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">My Tasks</h1>
      <WorkspaceAnalytics data={analyticsData} />
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <MyTasksView tasks={tasks as any} statusMap={statusMap} />
    </div>
  );
}

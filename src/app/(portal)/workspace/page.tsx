import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyTasks } from "@/lib/actions/workspace-tasks";
import { getFolders } from "@/lib/actions/workspace-folders";
import { fetchWorkspaceAnalytics } from "@/lib/actions/analytics";
import { MyTasksView } from "@/components/workspace/my-tasks-view";
import { FolderCreateDialog } from "@/components/workspace/folder-create-dialog";
import { WorkspaceAnalytics } from "@/components/workspace/workspace-analytics";
import { cn } from "@/lib/utils";
import type { RoleName } from "@/types";

export const dynamic = "force-dynamic";

export default async function WorkspacePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [tasks, folders, userRolesData, analyticsData] = await Promise.all([
    getMyTasks(),
    getFolders(),
    supabase.from("user_roles").select("roles(name)").eq("profile_id", user.id),
    fetchWorkspaceAnalytics(),
  ]);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles: RoleName[] = (userRolesData.data ?? []).map((ur: any) => ur.roles?.name).filter(Boolean);
  const canCreateFolder = roles.some((r) =>
    ["team_leader", "dept_manager", "director", "admin"].includes(r)
  );

  const statusMap: Record<string, { name: string; color: string }> = {};

  return (
    <div className="flex h-full flex-col gap-4 md:flex-row">
      {/* Folder sidebar */}
      <aside className="w-full shrink-0 md:w-64">
        <div className="rounded-lg border bg-card">
          <div className="flex items-center justify-between border-b px-3 py-2">
            <h2 className="text-sm font-semibold">Folders</h2>
            {canCreateFolder && <FolderCreateDialog />}
          </div>
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto p-2">
            <Link
              href="/workspace"
              className={cn(
                "block rounded-md px-2 py-1.5 text-sm font-medium",
                "bg-primary/10 text-primary"
              )}
            >
              📋 My Tasks
            </Link>
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            {(folders as any[]).length === 0 ? (
              <p className="px-2 py-3 text-xs text-muted-foreground">
                No folders yet. {canCreateFolder ? "Click + to create one." : ""}
              </p>
            ) : (
              <div className="mt-1 space-y-0.5">
                {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                {(folders as any[]).map((folder) => (
                  <Link
                    key={folder.id}
                    href={`/workspace/folders/${folder.id}`}
                    className="flex items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-accent"
                  >
                    <span className="text-base">{folder.icon ?? "📁"}</span>
                    <span className="truncate">{folder.name}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </aside>

      {/* Main: My Tasks */}
      <main className="flex-1 space-y-4">
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <WorkspaceAnalytics data={analyticsData} />
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <MyTasksView tasks={tasks as any} statusMap={statusMap} />
      </main>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getMyTasks } from "@/lib/actions/workspace-tasks";
import { MyTasksView } from "@/components/workspace/my-tasks-view";
import { buttonVariants } from "@/components/ui/button";
import { FolderOpen } from "lucide-react";

export default async function WorkspacePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const tasks = await getMyTasks();

  // Status map is empty here — MyTasksView handles missing statuses gracefully.
  // Statuses are per-folder and not fetched in the global my-tasks view.
  const statusMap: Record<string, { name: string; color: string }> = {};

  return (
    <div className="animate-fade-in-up space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">My Tasks</h1>
        <Link
          href="/workspace/folders"
          className={buttonVariants({ variant: "outline", size: "sm" })}
        >
          <FolderOpen className="mr-2 h-4 w-4" />
          Browse Folders
        </Link>
      </div>

      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <MyTasksView tasks={tasks as any} statusMap={statusMap} />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import Link from "next/link";
import { getTask } from "@/lib/actions/workspace-tasks";
import { getList } from "@/lib/actions/workspace-lists";
import { getFolder } from "@/lib/actions/workspace-folders";
import { getChecklistTemplates } from "@/lib/actions/workspace-templates";
import { getTaskTimeEntries } from "@/lib/actions/workspace-time-entries";
import { TaskDetailPanel } from "@/components/workspace/task-detail-panel";
import { buttonVariants } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

type PageProps = {
  params: Promise<{ taskId: string }>;
};

export default async function TaskDetailPage({ params }: PageProps) {
  const { taskId } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [task, checklistTemplates, timeEntries] = await Promise.all([
    getTask(taskId),
    getChecklistTemplates(),
    getTaskTimeEntries(taskId),
  ]);

  if (!task) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const taskData = task as any;

  // Fetch statuses from the task's list (which resolves folder or list-level)
  const list = await getList(taskData.list_id);
  const statuses = (list?.statuses ?? []) as {
    id: string;
    name: string;
    color: string;
    position: number;
  }[];

  // Fetch folder to get company_id for member lookup
  let companyId: string | null = null;
  if (list) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const folder = await getFolder((list as any).folder_id);
    companyId = folder?.company_id ?? null;
  }

  // Fetch company members for assignee dropdown
  let members: { id: string; first_name: string | null; last_name: string | null }[] = [];
  if (companyId) {
    const { data: companyMembers } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .eq("company_id", companyId)
      .eq("is_active", true)
      .order("first_name");
    members = companyMembers ?? [];
  }

  // Back link — go to folder or list view
  const backHref = list
    ? `/workspace/folders/${list.folder_id}`
    : "/workspace";

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href={backHref}
          className={buttonVariants({ variant: "ghost", size: "sm" })}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          Back
        </Link>
      </div>

      <TaskDetailPanel
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        task={task as any}
        statuses={statuses}
        members={members}
        checklistTemplates={checklistTemplates.map((t) => ({ id: t.id, name: t.name }))}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        timeEntries={timeEntries as any}
      />
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getList } from "@/lib/actions/workspace-lists";
import { getTasks } from "@/lib/actions/workspace-tasks";
import { getFolder } from "@/lib/actions/workspace-folders";
import { getChecklistTemplates } from "@/lib/actions/workspace-templates";
import { TaskCreateDialog } from "@/components/workspace/task-create-dialog";
import { FolderViewClient } from "@/components/workspace/folder-view-client";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ folderId: string; listId: string }>;
  searchParams: Promise<{ view?: string }>;
};

export default async function ListViewPage({ params, searchParams }: PageProps) {
  const { folderId, listId } = await params;
  const { view: viewParam } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const [list, folder, tasks, checklistTemplates] = await Promise.all([
    getList(listId),
    getFolder(folderId),
    getTasks(listId),
    getChecklistTemplates(),
  ]);

  if (!list || !folder) notFound();

  // Fetch company members for task assignment
  const { data: companyMembers } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("company_id", folder.company_id)
    .eq("is_active", true)
    .order("first_name");

  const members = companyMembers ?? [];

  // Statuses come from getList (resolves list-level or folder-level)
  const statuses = (list.statuses ?? []) as {
    id: string;
    name: string;
    color: string;
    position: number;
  }[];

  const activeView = (viewParam === "kanban" ? "kanban" : "list") as "list" | "kanban";

  void checklistTemplates; // available for future use

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b shrink-0">
        <h1 className="text-xl font-bold">{list.name}</h1>
        <TaskCreateDialog
          listId={listId}
          members={members}
          triggerLabel="New Task"
          triggerVariant="default"
          triggerSize="sm"
        />
      </div>

      {/* View area */}
      <div className="flex-1 overflow-auto pt-4">
        <FolderViewClient
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          tasks={tasks as any}
          statuses={statuses}
          members={members}
          initialView={activeView}
        />
      </div>
    </div>
  );
}

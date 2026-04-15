import { createClient } from "@/lib/supabase/server";
import { redirect, notFound } from "next/navigation";
import { getFolder } from "@/lib/actions/workspace-folders";
import { getLists } from "@/lib/actions/workspace-lists";
import { getTasks } from "@/lib/actions/workspace-tasks";
import { getListTemplates } from "@/lib/actions/workspace-templates";
import { FolderSettingsDialog } from "@/components/workspace/folder-settings-dialog";
import { TaskCreateDialog } from "@/components/workspace/task-create-dialog";
import { FolderViewClient } from "@/components/workspace/folder-view-client";
import type { RoleName } from "@/types";

type PageProps = {
  params: Promise<{ folderId: string }>;
  searchParams: Promise<{ list?: string; view?: string }>;
};

export default async function FolderViewPage({ params, searchParams }: PageProps) {
  const { folderId } = await params;
  const { list: listParam, view: viewParam } = await searchParams;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("profile_id", user.id);

  const roles: RoleName[] = (userRoles ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ur: any) => ur.roles.name as RoleName
  );

  const [folder, lists, listTemplates] = await Promise.all([
    getFolder(folderId),
    getLists(folderId),
    getListTemplates(),
  ]);

  if (!folder) notFound();

  // Fetch company members for task assignment and folder member management
  const { data: companyMembers } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email")
    .eq("company_id", folder.company_id)
    .eq("is_active", true)
    .order("first_name");

  const members = companyMembers ?? [];

  // Determine if current user is a folder admin (can see settings dialog)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const folderMembers: any[] = folder.workspace_folder_members ?? [];
  const currentMember = folderMembers.find((m) => m.profile_id === user.id);
  const isAdmin =
    currentMember?.permission === "admin" ||
    roles.includes("admin" as RoleName);

  // Determine active list
  const activeListId = listParam ?? undefined;

  // Fetch tasks — either for the active list or aggregate across all lists
  let tasks: unknown[] = [];
  let statuses: { id: string; name: string; color: string; position: number }[] = [];

  if (activeListId) {
    // Single list tasks
    tasks = await getTasks(activeListId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statuses = (folder.workspace_folder_statuses ?? []) as any;
  } else {
    // Aggregate tasks from all lists
    const taskArrays = await Promise.all(lists.map((l) => getTasks(l.id)));
    tasks = taskArrays.flat();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    statuses = (folder.workspace_folder_statuses ?? []) as any;
  }

  // Default list for TaskCreateDialog — use activeList or first list
  const defaultListId = activeListId ?? lists[0]?.id ?? "";

  const activeView = (viewParam === "kanban" ? "kanban" : "list") as "list" | "kanban";

  void listTemplates; // available if needed

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b shrink-0">
        <h1 className="text-xl font-bold">
          {activeListId
            ? (lists.find((l) => l.id === activeListId)?.name ?? folder.name)
            : folder.name}
        </h1>
        <div className="flex items-center gap-2">
          {defaultListId && (
            <TaskCreateDialog
              listId={defaultListId}
              members={members}
              triggerLabel="New Task"
              triggerVariant="default"
              triggerSize="sm"
            />
          )}
          {isAdmin && (
            <FolderSettingsDialog
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              folder={folder as any}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              companyMembers={members as any}
            />
          )}
        </div>
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

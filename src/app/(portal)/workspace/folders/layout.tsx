import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFolders } from "@/lib/actions/workspace-folders";
import { getListTemplates } from "@/lib/actions/workspace-templates";
import { FolderTreeSidebar } from "@/components/workspace/folder-tree-sidebar";
import type { RoleName } from "@/types";

export default async function WorkspaceFoldersLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const folders = (await getFolders()) as any[];

  // For each folder, fetch its lists
  const foldersWithLists = await Promise.all(
    folders.map(async (f) => {
      const { data: lists } = await supabase
        .from("workspace_lists")
        .select("id, name, position")
        .eq("folder_id", f.id)
        .eq("is_archived", false)
        .order("position");
      return { ...f, lists: lists ?? [] };
    })
  );

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("profile_id", user.id);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles: RoleName[] = (userRoles ?? []).map((ur: any) => ur.roles?.name).filter(Boolean);
  const canCreateFolder = roles.some((r) =>
    ["team_leader", "dept_manager", "director", "admin"].includes(r)
  );

  const listTemplates = await getListTemplates();

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0 -m-4 md:-m-6 md:pb-0">
      <FolderTreeSidebar
        folders={foldersWithLists}
        canCreateFolder={canCreateFolder}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        listTemplates={listTemplates as any}
      />
      <main className="flex-1 overflow-y-auto p-4 md:p-6">
        {children}
      </main>
    </div>
  );
}

import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { getFolders } from "@/lib/actions/workspace-folders";
import { FolderCard } from "@/components/workspace/folder-card";
import { FolderCreateDialog } from "@/components/workspace/folder-create-dialog";
import { hasRequiredRole } from "@/lib/utils/roles";
import type { RoleName } from "@/types";

const FOLDER_CREATE_ROLES: RoleName[] = ["team_leader", "dept_manager", "director", "admin"];

export default async function BrowseFoldersPage() {
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

  const canCreate = hasRequiredRole(roles, FOLDER_CREATE_ROLES);

  const folders = await getFolders();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Folders</h1>
        {canCreate && <FolderCreateDialog />}
      </div>

      {folders.length === 0 ? (
        <p className="text-muted-foreground text-sm">
          No folders yet. {canCreate ? "Create one to get started." : "Ask a team lead to create one."}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 animate-stagger">
          {folders.map((folder) => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const f = folder as any;
            return (
              <FolderCard
                key={f.id}
                folder={{
                  id: f.id,
                  name: f.name,
                  icon: f.icon,
                  color: f.color,
                  memberCount: Array.isArray(f.workspace_folder_members)
                    ? f.workspace_folder_members[0]?.count ?? 0
                    : 0,
                  listCount: Array.isArray(f.workspace_lists)
                    ? f.workspace_lists[0]?.count ?? 0
                    : 0,
                }}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

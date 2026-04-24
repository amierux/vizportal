import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getUserProfile, getUserRoles } from "@/lib/actions/helpers";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomTabs } from "@/components/layout/bottom-tabs";
import { Header } from "@/components/layout/header";
import { formatFullName } from "@/lib/utils/format";
import { PageTransition } from "@/components/shared/page-transition";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  const [profile, roles] = await Promise.all([
    getUserProfile(),
    getUserRoles(),
  ]);

  if (!profile) {
    redirect("/login");
  }

  if (!profile.profile_completed) {
    redirect("/complete-profile");
  }

  // Fetch workspace folders and their lists for sidebar
  const { data: rawFolders } = await supabase
    .from("workspace_folders")
    .select("id, name")
    .eq("company_id", profile.company_id)
    .eq("is_archived", false)
    .order("name");

  const foldersWithLists = await Promise.all(
    (rawFolders ?? []).map(async (folder) => {
      const { data: lists } = await supabase
        .from("workspace_lists")
        .select("id, name")
        .eq("folder_id", folder.id)
        .eq("is_archived", false)
        .order("name");
      return { id: folder.id, name: folder.name, workspace_lists: lists ?? [] };
    })
  );

  const userName = formatFullName(profile.first_name, profile.last_name);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        userRoles={roles}
        userName={userName}
        avatarUrl={profile.avatar_url}
        workspaceFolders={foldersWithLists}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userRoles={roles} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
      <BottomTabs userRoles={roles} />
    </div>
  );
}

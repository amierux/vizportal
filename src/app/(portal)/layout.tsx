import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Sidebar } from "@/components/layout/sidebar";
import { BottomTabs } from "@/components/layout/bottom-tabs";
import { Header } from "@/components/layout/header";
import { formatFullName } from "@/lib/utils/format";
import type { RoleName } from "@/types";

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile) {
    redirect("/login");
  }

  if (!profile.profile_completed) {
    redirect("/complete-profile");
  }

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("role_id, roles(name)")
    .eq("profile_id", user.id);

  const roles: RoleName[] = (userRoles ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ur: any) => ur.roles.name as RoleName
  );

  const userName = formatFullName(profile.first_name, profile.last_name);

  return (
    <div className="flex h-screen bg-background">
      <Sidebar
        userRoles={roles}
        userName={userName}
        avatarUrl={profile.avatar_url}
      />
      <div className="flex flex-1 flex-col overflow-hidden">
        <Header userRoles={roles} />
        <main className="flex-1 overflow-y-auto p-4 pb-20 md:p-6 md:pb-6">
          {children}
        </main>
      </div>
      <BottomTabs userRoles={roles} />
    </div>
  );
}

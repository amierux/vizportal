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
          <PageTransition>
            {children}
          </PageTransition>
        </main>
      </div>
      <BottomTabs userRoles={roles} />
    </div>
  );
}

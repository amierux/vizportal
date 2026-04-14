import { createClient } from "@/lib/supabase/server";
import { SettingsNav } from "@/components/settings/settings-nav";
import type { RoleName } from "@/types";

export default async function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: userRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("profile_id", user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const roles: RoleName[] = (userRoles ?? []).map((ur: any) => ur.roles.name);

  return (
    <div className="space-y-6">
      <SettingsNav userRoles={roles} />
      {children}
    </div>
  );
}

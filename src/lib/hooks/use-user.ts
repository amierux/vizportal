"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Profile, RoleName } from "@/types";

type UserState = {
  profile: Profile | null;
  roles: RoleName[];
  isLoading: boolean;
};

export function useUser() {
  const [state, setState] = useState<UserState>({
    profile: null,
    roles: [],
    isLoading: true,
  });

  useEffect(() => {
    const supabase = createClient();

    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setState({ profile: null, roles: [], isLoading: false });
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      const { data: userRoles } = await supabase
        .from("user_roles")
        .select("role_id, roles(name)")
        .eq("profile_id", user.id);

      const roles = (userRoles ?? []).map(
        (ur: any) => ur.roles.name as RoleName
      );

      setState({ profile, roles, isLoading: false });
    }

    loadUser();
  }, []);

  return state;
}

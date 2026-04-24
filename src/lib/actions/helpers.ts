import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import type { RoleName } from "@/types";

/**
 * Cached helper: get authenticated user's company_id.
 * Deduplicated within a single React render pass via React cache().
 */
export const getCompanyId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  return data?.company_id ?? null;
});

/**
 * Cached helper: get authenticated user's ID.
 */
export const getUserId = cache(async (): Promise<string | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
});

/**
 * Cached helper: get authenticated user's roles.
 */
export const getUserRoles = cache(async (): Promise<RoleName[]> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("profile_id", user.id);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((ur: any) => ur.roles.name as RoleName);
});

/**
 * Cached helper: get authenticated user's full profile.
 */
export const getUserProfile = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, avatar_url, company_id, profile_completed")
    .eq("id", user.id)
    .single();

  return data;
});

/**
 * Get date range for common periods.
 */
export function getDateRange(period: "today" | "this_month" | "last_30_days" | "this_year") {
  const now = new Date();
  const today = now.toISOString().split("T")[0];

  switch (period) {
    case "today":
      return { start: today, end: today };
    case "this_month": {
      const start = new Date(now.getFullYear(), now.getMonth(), 1)
        .toISOString()
        .split("T")[0];
      return { start, end: today };
    }
    case "last_30_days": {
      const d = new Date();
      d.setDate(d.getDate() - 29);
      return { start: d.toISOString().split("T")[0], end: today };
    }
    case "this_year": {
      const start = `${now.getFullYear()}-01-01`;
      return { start, end: today };
    }
  }
}

/**
 * Check if user has one of the specified roles.
 */
export function hasRole(userRoles: RoleName[], required: RoleName[]): boolean {
  return userRoles.some((r) => required.includes(r));
}

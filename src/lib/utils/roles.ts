import type { RoleName } from "@/types";
import { ROUTE_ROLE_MAP } from "@/lib/constants";

export function hasRequiredRole(
  userRoles: RoleName[],
  requiredRoles: RoleName[]
): boolean {
  if (requiredRoles.length === 0) return true;
  return userRoles.some((role) => requiredRoles.includes(role));
}

export function getRequiredRolesForPath(pathname: string): RoleName[] {
  if (ROUTE_ROLE_MAP[pathname] !== undefined) {
    return ROUTE_ROLE_MAP[pathname];
  }

  const segments = pathname.split("/").filter(Boolean);
  while (segments.length > 0) {
    segments.pop();
    const parentPath = "/" + segments.join("/");
    if (ROUTE_ROLE_MAP[parentPath] !== undefined) {
      return ROUTE_ROLE_MAP[parentPath];
    }
  }

  return [];
}

export function canAccessRoute(
  userRoles: RoleName[],
  pathname: string
): boolean {
  const requiredRoles = getRequiredRolesForPath(pathname);
  return hasRequiredRole(userRoles, requiredRoles);
}

export function isAdminOrHr(roles: RoleName[]): boolean {
  return roles.includes("admin") || roles.includes("hr");
}

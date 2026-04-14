"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { RoleName } from "@/types";
import { hasRequiredRole } from "@/lib/utils/roles";

type NavItem = {
  label: string;
  href: string;
  roles: RoleName[];
};

const SETTINGS_NAV: NavItem[] = [
  { label: "Company", href: "/settings/company", roles: ["admin", "hr"] },
  { label: "Invitations", href: "/settings/invitations", roles: ["admin", "hr"] },
  { label: "Departments", href: "/settings/departments", roles: ["admin"] },
  { label: "Job Levels", href: "/settings/job-levels", roles: ["admin"] },
  { label: "Roles", href: "/settings/roles", roles: ["admin"] },
  { label: "Employees", href: "/settings/employees", roles: ["admin"] },
  { label: "Attendance", href: "/settings/attendance", roles: ["admin"] },
  { label: "Approval", href: "/settings/approval", roles: ["admin"] },
  { label: "Payroll", href: "/settings/payroll", roles: ["admin"] },
  { label: "System", href: "/settings/system", roles: ["admin"] },
];

type SettingsNavProps = {
  userRoles: RoleName[];
};

export function SettingsNav({ userRoles }: SettingsNavProps) {
  const pathname = usePathname();

  const visibleItems = SETTINGS_NAV.filter((item) =>
    hasRequiredRole(userRoles, item.roles)
  );

  return (
    <nav className="flex gap-1 overflow-x-auto border-b pb-px">
      {visibleItems.map((item) => {
        const isActive = pathname === item.href;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "whitespace-nowrap px-3 py-2 text-sm font-medium transition-colors rounded-t-md",
              isActive
                ? "border-b-2 border-primary text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

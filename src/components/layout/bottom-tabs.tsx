"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  MoreHorizontal,
  Clock,
  CalendarDays,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleName } from "@/types";
import { hasRequiredRole } from "@/lib/utils/roles";

type TabItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: RoleName[];
};

const TAB_ITEMS: TabItem[] = [
  { label: "Home", href: "/dashboard", icon: LayoutDashboard, roles: [] },
  {
    label: "Employees",
    href: "/employees",
    icon: Users,
    roles: ["admin", "hr", "director", "business_manager", "dept_manager", "team_leader"],
  },
  { label: "Attendance", href: "/attendance", icon: Clock, roles: [] },
  { label: "Leave", href: "/leave", icon: CalendarDays, roles: [] },
  { label: "More", href: "/settings", icon: MoreHorizontal, roles: [] },
];

type BottomTabsProps = {
  userRoles: RoleName[];
};

export function BottomTabs({ userRoles }: BottomTabsProps) {
  const pathname = usePathname();

  const visibleTabs = TAB_ITEMS.filter((item) =>
    hasRequiredRole(userRoles, item.roles)
  );

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-background md:hidden">
      <div className="flex h-16 items-center justify-around">
        {visibleTabs.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-2 text-xs",
                isActive
                  ? "text-primary"
                  : "text-muted-foreground"
              )}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

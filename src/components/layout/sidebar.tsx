"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  UserCircle,
  Settings,
  LogOut,
  ChevronLeft,
  Clock,
  CalendarDays,
  CheckSquare,
  Timer,
  Wallet,
  LayoutGrid,
  ClipboardList,
  FileText,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/actions/auth";
import type { RoleName } from "@/types";
import { hasRequiredRole } from "@/lib/utils/roles";

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: RoleName[];
};

const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: [] },
  {
    label: "Employee Info",
    href: "/employees",
    icon: Users,
    roles: [],
  },
  { label: "Forms", href: "/forms", icon: FileText, roles: [] },
  { label: "Workspace", href: "/workspace", icon: LayoutGrid, roles: [] },
  { label: "Attendance", href: "/attendance", icon: Clock, roles: [] },
  { label: "Leave", href: "/leave", icon: CalendarDays, roles: [] },
  { label: "Overtime", href: "/overtime", icon: Timer, roles: [] },
  { label: "Payroll", href: "/payroll", icon: Wallet, roles: [] },
  { label: "Timesheet", href: "/timesheet", icon: ClipboardList, roles: [] },
  { label: "Approvals", href: "/approvals", icon: CheckSquare, roles: [] },
  { label: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
];

type SidebarProps = {
  userRoles: RoleName[];
  userName: string;
  avatarUrl: string | null;
};

export function Sidebar({ userRoles, userName, avatarUrl }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);

  const visibleItems = NAV_ITEMS.filter((item) =>
    hasRequiredRole(userRoles, item.roles)
  );

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
        {!collapsed && (
          <span className="text-lg font-bold tracking-tight text-sidebar-foreground">
            VizPortal
          </span>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className={cn(
            buttonVariants({ variant: "ghost", size: "icon" }),
            "ml-auto text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <ChevronLeft className={cn("h-4 w-4 transition-transform duration-200", collapsed && "rotate-180")} />
        </button>
      </div>

      <nav className="flex-1 space-y-1 p-2">
        {visibleItems.map((item) => {
          const isActive = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground border-l-2 border-sidebar-ring"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <item.icon className="h-5 w-5 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-sidebar-border p-2">
        <DropdownMenu>
          <DropdownMenuTrigger
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <Avatar className="h-8 w-8">
              <AvatarImage src={avatarUrl ?? undefined} />
              <AvatarFallback>
                {userName.charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            {!collapsed && (
              <span className="truncate font-medium text-sidebar-foreground">{userName}</span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuItem onClick={() => router.push("/profile")}>
              <UserCircle className="mr-2 h-4 w-4" />
              Profile
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={async () => {
                await logout();
              }}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </aside>
  );
}

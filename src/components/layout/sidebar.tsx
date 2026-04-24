"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Users, UserCircle, Settings, LogOut, ChevronLeft,
  ChevronDown, Clock, CalendarDays, CheckSquare, Timer,
  Wallet, LayoutGrid, ClipboardList, FileText, Folder, List,
  CircleDot,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logout } from "@/lib/actions/auth";
import type { RoleName } from "@/types";
import { hasRequiredRole } from "@/lib/utils/roles";

type WorkspaceFolder = {
  id: string;
  name: string;
  workspace_lists: { id: string; name: string }[];
};

type NavChild = {
  label: string;
  href: string;
  icon?: React.ElementType;
};

type NavItem = {
  label: string;
  href: string;
  icon: React.ElementType;
  roles: RoleName[];
  children?: NavChild[];
};

type NavGroup = {
  label?: string;
  items: NavItem[];
  roles: RoleName[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    roles: [],
    items: [
      { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, roles: [] },
    ],
  },
  {
    label: "People",
    roles: [],
    items: [
      { label: "Employee Info", href: "/employees", icon: Users, roles: [] },
      { label: "Approvals", href: "/approvals", icon: CheckSquare, roles: [] },
    ],
  },
  {
    label: "Time & Attendance",
    roles: [],
    items: [
      {
        label: "Attendance", href: "/attendance", icon: Clock, roles: [],
        children: [
          { label: "My Attendance", href: "/attendance" },
          { label: "Manage", href: "/attendance/manage" },
          { label: "Team", href: "/attendance/team" },
          { label: "Reports", href: "/attendance/reports" },
        ],
      },
      {
        label: "Leave", href: "/leave", icon: CalendarDays, roles: [],
        children: [
          { label: "My Leave", href: "/leave" },
          { label: "Team", href: "/leave/team" },
          { label: "Settings", href: "/leave/settings" },
        ],
      },
      { label: "Overtime", href: "/overtime", icon: Timer, roles: [] },
      { label: "Timesheet", href: "/timesheet", icon: ClipboardList, roles: [] },
    ],
  },
  {
    label: "Finance",
    roles: [],
    items: [
      {
        label: "Payroll", href: "/payroll", icon: Wallet, roles: [],
        children: [
          { label: "My Payroll", href: "/payroll" },
          { label: "Process", href: "/payroll/process" },
        ],
      },
    ],
  },
  {
    label: "Workspace",
    roles: [],
    items: [
      { label: "My Tasks", href: "/workspace", icon: LayoutGrid, roles: [] },
    ],
  },
  {
    label: "Other",
    roles: [],
    items: [
      { label: "Forms", href: "/forms", icon: FileText, roles: [] },
    ],
  },
  {
    label: "Admin",
    roles: ["admin"],
    items: [
      { label: "Settings", href: "/settings", icon: Settings, roles: ["admin"] },
    ],
  },
];

type SidebarProps = {
  userRoles: RoleName[];
  userName: string;
  avatarUrl: string | null;
  workspaceFolders?: WorkspaceFolder[];
};

export function Sidebar({ userRoles, userName, avatarUrl, workspaceFolders = [] }: SidebarProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [collapsed, setCollapsed] = useState(false);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(() => {
    // Auto-expand the group containing the active path
    const initial = new Set<string>();
    NAV_GROUPS.forEach((group) => {
      group.items.forEach((item) => {
        if (item.children && pathname.startsWith(item.href)) {
          initial.add(item.href);
        }
      });
    });
    // Auto-expand active workspace folder
    const folderMatch = pathname.match(/\/workspace\/folders\/([^/]+)/);
    if (folderMatch) initial.add(`folder-${folderMatch[1]}`);
    return initial;
  });

  function toggleExpand(key: string) {
    setExpandedItems((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  function renderNavItem(item: NavItem) {
    const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== "/dashboard");
    const hasChildren = item.children && item.children.length > 0;
    const isExpanded = expandedItems.has(item.href);

    return (
      <div key={item.href}>
        <div
          className={cn(
            "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out cursor-pointer",
            isActive && !hasChildren
              ? "bg-sidebar-primary text-sidebar-primary-foreground"
              : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          )}
          onClick={() => {
            if (hasChildren) {
              toggleExpand(item.href);
            } else {
              router.push(item.href);
            }
          }}
        >
          <item.icon className="h-5 w-5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 truncate">{item.label}</span>
              {hasChildren && (
                <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform duration-200", !isExpanded && "-rotate-90")} />
              )}
            </>
          )}
        </div>
        {!collapsed && hasChildren && isExpanded && (
          <div className="ml-4 border-l border-sidebar-border pl-3 mt-0.5 space-y-0.5">
            {item.children!.map((child) => {
              const childActive = pathname === child.href;
              return (
                <Link
                  key={child.href}
                  href={child.href}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-all duration-200 ease-in-out",
                    childActive
                      ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                      : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                  )}
                >
                  <CircleDot className="h-3 w-3 shrink-0" />
                  <span className="truncate">{child.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  function renderWorkspaceFolders() {
    if (collapsed || workspaceFolders.length === 0) return null;

    return workspaceFolders.map((folder) => {
      const folderKey = `folder-${folder.id}`;
      const isExpanded = expandedItems.has(folderKey);
      const isFolderActive = pathname.includes(`/folders/${folder.id}`);
      const activeListId = pathname.match(/\/lists\/([^/]+)/)?.[1];

      return (
        <div key={folder.id}>
          <div
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-all duration-200 ease-in-out cursor-pointer",
              isFolderActive && !activeListId
                ? "bg-sidebar-primary text-sidebar-primary-foreground"
                : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            )}
            onClick={() => toggleExpand(folderKey)}
          >
            <Folder className="h-4 w-4 shrink-0" />
            <Link href={`/workspace/folders/${folder.id}`} className="flex-1 truncate" onClick={(e) => e.stopPropagation()}>
              {folder.name}
            </Link>
            {folder.workspace_lists?.length > 0 && (
              <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 transition-transform duration-200", !isExpanded && "-rotate-90")} />
            )}
          </div>
          {isExpanded && folder.workspace_lists?.length > 0 && (
            <div className="ml-4 border-l border-sidebar-border pl-3 mt-0.5 space-y-0.5">
              {folder.workspace_lists.map((list) => {
                const listActive = activeListId === list.id;
                return (
                  <Link
                    key={list.id}
                    href={`/workspace/folders/${folder.id}/lists/${list.id}`}
                    className={cn(
                      "flex items-center gap-2 rounded-md px-3 py-1.5 text-sm transition-all duration-200 ease-in-out",
                      listActive
                        ? "bg-sidebar-primary text-sidebar-primary-foreground font-medium"
                        : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <List className="h-3 w-3 shrink-0" />
                    <span className="truncate">{list.name}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      );
    });
  }

  return (
    <aside
      className={cn(
        "hidden md:flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200 ease-in-out",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header */}
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

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-2 space-y-4">
        {NAV_GROUPS.map((group, groupIdx) => {
          if (group.roles.length > 0 && !hasRequiredRole(userRoles, group.roles)) return null;

          const visibleItems = group.items.filter((item) =>
            hasRequiredRole(userRoles, item.roles)
          );
          if (visibleItems.length === 0) return null;

          const isWorkspaceGroup = group.label === "Workspace";

          return (
            <div key={groupIdx}>
              {group.label && !collapsed && (
                <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                  {group.label}
                </p>
              )}
              {collapsed && groupIdx > 0 && (
                <div className="mx-2 my-1 border-t border-sidebar-border" />
              )}
              <div className="space-y-0.5">
                {visibleItems.map(renderNavItem)}
                {isWorkspaceGroup && renderWorkspaceFolders()}
              </div>
            </div>
          );
        })}
      </nav>

      {/* Footer — User Menu */}
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

"use client";

import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { buttonVariants } from "@/components/ui/button";
import { Menu } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTrigger,
  SheetTitle,
} from "@/components/ui/sheet";
import Link from "next/link";
import { logout } from "@/lib/actions/auth";
import type { RoleName } from "@/types";
import { hasRequiredRole } from "@/lib/utils/roles";

function getPageTitle(pathname: string): string {
  const map: Record<string, string> = {
    "/dashboard": "Dashboard",
    "/company": "Company Info",
    "/employees": "Employees",
    "/profile": "My Profile",
    "/settings": "Settings",
    "/settings/job-levels": "Job Levels",
    "/settings/departments": "Departments",
    "/settings/roles": "Roles",
    "/settings/invitations": "Invitations",
  };
  return map[pathname] ?? "VizPortal";
}

type HeaderProps = {
  userRoles: RoleName[];
};

export function Header({ userRoles }: HeaderProps) {
  const pathname = usePathname();

  const mobileMenuItems = [
    { label: "Company", href: "/company", roles: ["admin", "hr"] as RoleName[] },
    { label: "Settings", href: "/settings", roles: ["admin"] as RoleName[] },
    { label: "Invitations", href: "/settings/invitations", roles: ["admin", "hr"] as RoleName[] },
  ].filter((item) => hasRequiredRole(userRoles, item.roles));

  return (
    <header className="flex h-14 items-center justify-between border-b px-4">
      <div className="flex items-center gap-2 md:hidden">
        <Sheet>
          <SheetTrigger
            className={buttonVariants({ variant: "ghost", size: "icon" })}
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </SheetTrigger>
          <SheetContent side="left" className="w-64">
            <SheetTitle>Menu</SheetTitle>
            <nav className="mt-4 space-y-2">
              {mobileMenuItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="block rounded-md px-3 py-2 text-sm font-medium hover:bg-accent"
                >
                  {item.label}
                </Link>
              ))}
              <button
                onClick={async () => {
                  await logout();
                }}
                className="block w-full rounded-md px-3 py-2 text-left text-sm font-medium text-destructive hover:bg-accent"
              >
                Sign out
              </button>
            </nav>
          </SheetContent>
        </Sheet>
      </div>

      <h1 className="text-lg font-semibold">{getPageTitle(pathname)}</h1>

      <div className="flex items-center gap-2">
        <ThemeToggle />
      </div>
    </header>
  );
}

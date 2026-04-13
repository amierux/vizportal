"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { formatFullName } from "@/lib/utils/format";
import { EMPLOYMENT_STATUSES, EMPLOYEES_PER_PAGE } from "@/lib/constants";
import type { Department } from "@/types";
import { useState } from "react";

type EmployeeRow = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  employee_details: {
    job_position: string | null;
    employment_status: string;
    departments: { name: string } | null;
    job_levels: { code: string; name: string } | null;
  };
};

type EmployeeTableProps = {
  employees: EmployeeRow[];
  totalCount: number;
  page: number;
  departments: Pick<Department, "id" | "name">[];
};

export function EmployeeTable({
  employees,
  totalCount,
  page,
  departments,
}: EmployeeTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get("search") ?? "");

  const totalPages = Math.ceil(totalCount / EMPLOYEES_PER_PAGE);

  function updateFilter(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    params.set("page", "1");
    router.push(`/employees?${params.toString()}`);
  }

  function handleSearch() {
    updateFilter("search", search);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-9"
          />
        </div>
        <Select
          value={searchParams.get("department_id") ?? ""}
          onValueChange={(v) => updateFilter("department_id", v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-48">
            <SelectValue placeholder="All Departments" />
          </SelectTrigger>
          <SelectContent>
            {departments.map((d) => (
              <SelectItem key={d.id} value={d.id}>
                {d.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={searchParams.get("status") ?? ""}
          onValueChange={(v) => updateFilter("status", v ?? "")}
        >
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            {EMPLOYMENT_STATUSES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="hidden rounded-md border md:block">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Level</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {employees.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No employees found
                </TableCell>
              </TableRow>
            )}
            {employees.map((emp) => (
              <TableRow key={emp.id}>
                <TableCell>
                  <Link
                    href={`/employees/${emp.id}`}
                    className="font-medium hover:underline"
                  >
                    {formatFullName(emp.first_name, emp.last_name)}
                  </Link>
                  <div className="text-xs text-muted-foreground">{emp.email}</div>
                </TableCell>
                <TableCell>{emp.employee_details.departments?.name ?? "—"}</TableCell>
                <TableCell>{emp.employee_details.job_levels?.code ?? "—"}</TableCell>
                <TableCell>{emp.employee_details.job_position ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={emp.employee_details.employment_status === "regular" ? "default" : "secondary"}>
                    {emp.employee_details.employment_status}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="space-y-3 md:hidden">
        {employees.map((emp) => (
          <Link
            key={emp.id}
            href={`/employees/${emp.id}`}
            className="block rounded-lg border p-4 hover:bg-accent"
          >
            <div className="font-medium">
              {formatFullName(emp.first_name, emp.last_name)}
            </div>
            <div className="text-sm text-muted-foreground">{emp.email}</div>
            <div className="mt-2 flex gap-2">
              <Badge variant="outline">
                {emp.employee_details.departments?.name ?? "No Dept"}
              </Badge>
              <Badge variant="secondary">
                {emp.employee_details.employment_status}
              </Badge>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * EMPLOYEES_PER_PAGE + 1}–
            {Math.min(page * EMPLOYEES_PER_PAGE, totalCount)} of {totalCount}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => updateFilter("page", String(page - 1))}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => updateFilter("page", String(page + 1))}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

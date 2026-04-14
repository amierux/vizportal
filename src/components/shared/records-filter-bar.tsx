"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Search, Download, FileSpreadsheet, FileText } from "lucide-react";

type Department = { id: string; name: string };

type RecordsFilterBarProps = {
  departments: Department[];
  onFilter: (filters: {
    startDate: string;
    endDate: string;
    search: string;
    departmentId: string;
  }) => void;
  onExportCsv: () => void;
  onExportPdf: () => void;
  showDepartmentFilter?: boolean;
};

export function RecordsFilterBar({
  departments,
  onFilter,
  onExportCsv,
  onExportPdf,
  showDepartmentFilter = true,
}: RecordsFilterBarProps) {
  // Default to current month
  const now = new Date();
  const defaultStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0];
  const defaultEnd = now.toISOString().split("T")[0];

  const [startDate, setStartDate] = useState(defaultStart);
  const [endDate, setEndDate] = useState(defaultEnd);
  const [search, setSearch] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  function handleFilter() {
    onFilter({ startDate, endDate, search, departmentId });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:flex-wrap">
      <div className="space-y-1">
        <Label className="text-xs">Start Date</Label>
        <Input
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
          className="w-auto"
        />
      </div>
      <div className="space-y-1">
        <Label className="text-xs">End Date</Label>
        <Input
          type="date"
          value={endDate}
          onChange={(e) => setEndDate(e.target.value)}
          className="w-auto"
        />
      </div>
      <div className="space-y-1 flex-1 min-w-[150px]">
        <Label className="text-xs">Search Name</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search employee..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>
      {showDepartmentFilter && (
        <div className="space-y-1">
          <Label className="text-xs">Department</Label>
          <Select value={departmentId} onValueChange={(value) => setDepartmentId(value ?? "")}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="All Departments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
      <Button onClick={handleFilter} size="sm">
        <Search className="mr-2 h-4 w-4" />
        Filter
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-8 px-3">
          <Download className="h-4 w-4" />
          Export
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={onExportCsv}>
            <FileSpreadsheet className="mr-2 h-4 w-4" />
            Export as CSV
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onExportPdf}>
            <FileText className="mr-2 h-4 w-4" />
            Export as PDF
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

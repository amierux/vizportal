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
import { Search, Download } from "lucide-react";

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
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
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
        <div className="space-y-1 flex-1">
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
      </div>
      <div className="flex gap-2">
        <Button variant="outline" size="sm" onClick={onExportCsv}>
          <Download className="mr-2 h-4 w-4" />
          Export CSV
        </Button>
        <Button variant="outline" size="sm" onClick={onExportPdf}>
          <Download className="mr-2 h-4 w-4" />
          Export PDF
        </Button>
      </div>
    </div>
  );
}

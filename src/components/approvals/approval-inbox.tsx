"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { getMyApprovals } from "@/lib/actions/approvals";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock, Inbox, Search, Eye } from "lucide-react";
import { formatFullName, formatDate } from "@/lib/utils/format";

const STATUS_BADGE: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

const TYPE_LABELS: Record<string, string> = {
  manual_clock: "Manual Clock Entry",
  leave_request: "Leave Request",
  leave_cancellation: "Leave Cancellation",
  overtime: "Overtime Request",
};

const STATUS_OPTIONS = [
  { value: "all", label: "All Statuses" },
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
];

type ApprovalInboxProps = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  approvals: any[];
};

export function ApprovalInbox({ approvals: initialApprovals }: ApprovalInboxProps) {
  const router = useRouter();

  // Filter state
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("pending");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  // Data state
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [records, setRecords] = useState<any[]>(initialApprovals);
  const [loading, setLoading] = useState(false);

  const fetchRecords = useCallback(async () => {
    setLoading(true);
    try {
      const data = await getMyApprovals({
        search: search || undefined,
        status: filterStatus !== "all" ? filterStatus : undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setRecords(data);
    } catch {
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, [search, filterStatus, startDate, endDate]);

  // Refetch when filters change (debounce search)
  useEffect(() => {
    const t = setTimeout(fetchRecords, search ? 300 : 0);
    return () => clearTimeout(t);
  }, [filterStatus, startDate, endDate, fetchRecords, search]);

  const pendingCount = records.filter((s: any) => s.status === "pending").length;

  return (
    <div className="space-y-4 animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Approval Inbox</h2>
        {pendingCount > 0 && (
          <Badge variant="secondary">{pendingCount} pending</Badge>
        )}
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap items-end gap-2">
        <div className="flex-1 min-w-[180px] max-w-xs">
          <label className="text-xs text-muted-foreground mb-1 block">Search</label>
          <div className="relative">
            <Input
              placeholder="Requester name or type..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm pr-8"
            />
            <Button
              variant="ghost"
              size="icon"
              className="absolute right-0 top-0 h-8 w-8"
              onClick={fetchRecords}
              type="button"
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">Status</label>
          <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v ?? "all")}>
            <SelectTrigger className="h-8 text-sm w-36">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_OPTIONS.map((o) => (
                <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">From</label>
          <Input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
        <div>
          <label className="text-xs text-muted-foreground mb-1 block">To</label>
          <Input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="h-8 text-sm w-36"
          />
        </div>
      </div>

      {/* List */}
      {loading ? (
        <div className="py-8 text-center text-muted-foreground text-sm">Loading...</div>
      ) : records.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Inbox className="h-12 w-12 text-muted-foreground" />
            <p className="mt-4 text-lg font-medium">No approvals found</p>
            <p className="text-sm text-muted-foreground">Try adjusting your filters.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3 animate-stagger">
          {records.map((step: any) => {
            const request = step.approval_requests;
            const requester = request?.requester;
            const requesterName = requester
              ? formatFullName(requester.first_name, requester.last_name)
              : "Unknown";
            const typeLabel = TYPE_LABELS[request?.type] ?? request?.type ?? "Request";

            return (
              <div
                key={step.id}
                className="flex items-center gap-4 rounded-lg border p-4 cursor-pointer hover:bg-muted/50 transition-colors card-hover"
                onClick={() => router.push(`/approvals/view/${step.id}`)}
              >
                <Clock className="h-5 w-5 text-muted-foreground shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{typeLabel}</span>
                    <Badge variant={STATUS_BADGE[step.status] ?? "outline"} className="text-xs">
                      {step.status}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      Step {step.step_order}/{request?.total_steps}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    From <strong>{requesterName}</strong> · {formatDate(request?.created_at)}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    router.push(`/approvals/view/${step.id}`);
                  }}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

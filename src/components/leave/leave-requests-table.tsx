"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils/format";
import { cancelLeaveRequest } from "@/lib/actions/leave";
import { toast } from "sonner";
import { X } from "lucide-react";

type LeaveRequestRow = {
  id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string | null;
  created_at: string;
  leave_types: { name: string; code: string } | null;
};

type LeaveRequestsTableProps = {
  requests: LeaveRequestRow[];
  showEmployee?: boolean;
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

export function LeaveRequestsTable({ requests, showEmployee }: LeaveRequestsTableProps) {
  async function handleCancel(id: string) {
    const result = await cancelLeaveRequest(id);
    if ("error" in result) toast.error(result.error);
    else toast.success("Leave request cancelled");
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          {showEmployee && <TableHead>Employee</TableHead>}
          <TableHead>Type</TableHead>
          <TableHead>Dates</TableHead>
          <TableHead>Days</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Filed</TableHead>
          <TableHead></TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {requests.length === 0 ? (
          <TableRow>
            <TableCell
              colSpan={showEmployee ? 7 : 6}
              className="text-center text-muted-foreground"
            >
              No leave requests
            </TableCell>
          </TableRow>
        ) : (
          requests.map((req) => (
            <TableRow key={req.id} className="row-hover">
              {showEmployee && (
                <TableCell>
                  {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    (req as any).profiles
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ? `${(req as any).profiles.first_name} ${(req as any).profiles.last_name}`
                      : "—"
                  }
                </TableCell>
              )}
              <TableCell>
                {req.leave_types?.name ?? "—"}{" "}
                <span className="text-muted-foreground">({req.leave_types?.code})</span>
              </TableCell>
              <TableCell>
                {formatDate(req.start_date)} — {formatDate(req.end_date)}
              </TableCell>
              <TableCell>{req.total_days}</TableCell>
              <TableCell>
                <Badge variant={STATUS_VARIANTS[req.status] ?? "outline"}>
                  {req.status}
                </Badge>
              </TableCell>
              <TableCell>{formatDate(req.created_at)}</TableCell>
              <TableCell>
                {req.status === "pending" && (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleCancel(req.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </TableCell>
            </TableRow>
          ))
        )}
      </TableBody>
    </Table>
  );
}

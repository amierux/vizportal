"use client";

import { useState } from "react";
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
import { Eye } from "lucide-react";
import { RequestDetailDialog } from "@/components/shared/request-detail-dialog";

type LeaveRequestRow = {
  id: string;
  start_date: string;
  end_date: string;
  total_days: number;
  status: string;
  reason: string | null;
  created_at: string;
  cancellation_approval_id?: string | null;
  cancellation_reason?: string | null;
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
  const [detailRequest, setDetailRequest] = useState<LeaveRequestRow | null>(null);

  return (
    <>
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
              <TableRow
                key={req.id}
                className="row-hover cursor-pointer"
                onClick={() => setDetailRequest(req)}
              >
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
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => { e.stopPropagation(); setDetailRequest(req); }}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {detailRequest && (
        <RequestDetailDialog
          open={!!detailRequest}
          onOpenChange={(open) => { if (!open) setDetailRequest(null); }}
          type="leave_request"
          referenceId={detailRequest.id}
          title={`Leave Request: ${detailRequest.leave_types?.name ?? "Leave"}`}
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div className="text-muted-foreground">Type</div>
            <div>{detailRequest.leave_types?.name ?? "—"} ({detailRequest.leave_types?.code ?? "—"})</div>

            <div className="text-muted-foreground">Start Date</div>
            <div>{formatDate(detailRequest.start_date)}</div>

            <div className="text-muted-foreground">End Date</div>
            <div>{formatDate(detailRequest.end_date)}</div>

            <div className="text-muted-foreground">Days</div>
            <div>{detailRequest.total_days}</div>

            <div className="text-muted-foreground">Status</div>
            <div>
              <Badge variant={STATUS_VARIANTS[detailRequest.status] ?? "outline"}>
                {detailRequest.status}
              </Badge>
            </div>

            <div className="text-muted-foreground">Filed</div>
            <div>{formatDate(detailRequest.created_at)}</div>

            {detailRequest.reason && (
              <>
                <div className="text-muted-foreground">Reason</div>
                <div>{detailRequest.reason}</div>
              </>
            )}
          </div>
        </RequestDetailDialog>
      )}

    </>
  );
}

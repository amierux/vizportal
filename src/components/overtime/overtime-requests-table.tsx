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
import { cancelOvertimeRequest } from "@/lib/actions/overtime";
import { toast } from "sonner";
import { X } from "lucide-react";
import { RequestDetailDialog } from "@/components/shared/request-detail-dialog";

type OvertimeRequestRow = {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  total_hours: number;
  status: string;
  reason: string | null;
  created_at: string;
};

type OvertimeRequestsTableProps = {
  requests: OvertimeRequestRow[];
};

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

export function OvertimeRequestsTable({ requests }: OvertimeRequestsTableProps) {
  const [detailRequest, setDetailRequest] = useState<OvertimeRequestRow | null>(null);

  async function handleCancel(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    const result = await cancelOvertimeRequest(id);
    if ("error" in result) toast.error(result.error);
    else toast.success("Overtime request cancelled");
  }

  return (
    <>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Time Range</TableHead>
            <TableHead>Hours</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Reason</TableHead>
            <TableHead>Filed</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {requests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} className="text-center text-muted-foreground">
                No overtime requests
              </TableCell>
            </TableRow>
          ) : (
            requests.map((req) => (
              <TableRow
                key={req.id}
                className="row-hover cursor-pointer"
                onClick={() => setDetailRequest(req)}
              >
                <TableCell>{formatDate(req.date)}</TableCell>
                <TableCell>
                  {req.start_time} — {req.end_time}
                </TableCell>
                <TableCell>{req.total_hours}h</TableCell>
                <TableCell>
                  <Badge variant={STATUS_VARIANTS[req.status] ?? "outline"}>
                    {req.status}
                  </Badge>
                </TableCell>
                <TableCell className="max-w-[200px] truncate">{req.reason ?? "—"}</TableCell>
                <TableCell>{formatDate(req.created_at)}</TableCell>
                <TableCell>
                  {req.status === "pending" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleCancel(e, req.id)}
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

      {detailRequest && (
        <RequestDetailDialog
          open={!!detailRequest}
          onOpenChange={(open) => { if (!open) setDetailRequest(null); }}
          type="overtime"
          referenceId={detailRequest.id}
          title={`Overtime: ${formatDate(detailRequest.date)}`}
        >
          <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-sm">
            <div className="text-muted-foreground">Date</div>
            <div>{formatDate(detailRequest.date)}</div>

            <div className="text-muted-foreground">Time Range</div>
            <div>{detailRequest.start_time} — {detailRequest.end_time}</div>

            <div className="text-muted-foreground">Hours</div>
            <div>{detailRequest.total_hours}h</div>

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

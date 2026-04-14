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
import { cancelOvertimeRequest } from "@/lib/actions/overtime";
import { toast } from "sonner";
import { X } from "lucide-react";

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
  async function handleCancel(id: string) {
    const result = await cancelOvertimeRequest(id);
    if ("error" in result) toast.error(result.error);
    else toast.success("Overtime request cancelled");
  }

  return (
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
            <TableRow key={req.id} className="row-hover">
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

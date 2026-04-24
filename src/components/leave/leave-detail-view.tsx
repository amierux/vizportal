"use client";

import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, CalendarDays } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { cancelLeaveRequest } from "@/lib/actions/leave";
import { toast } from "sonner";
import type { RoleName } from "@/types";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  pending: "outline",
  approved: "default",
  rejected: "destructive",
  cancelled: "secondary",
};

type Props = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  request: any;
  roles: RoleName[];
  currentUserId: string;
};

export function LeaveDetailView({ request, roles: _roles, currentUserId }: Props) {
  const router = useRouter();
  const isOwner = request.profile_id === currentUserId;
  const dept = request.profiles?.employee_details?.departments?.name ?? "—";

  async function handleCancel() {
    const result = await cancelLeaveRequest(request.id);
    if ("error" in result) toast.error(result.error);
    else {
      toast.success("Leave request cancelled");
      router.push("/leave");
    }
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Back button */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={() => router.push("/leave")}>
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Leave
        </Button>
      </div>

      <div className="flex items-center gap-3">
        <CalendarDays className="h-6 w-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Leave Request</h1>
          <p className="text-sm text-muted-foreground">
            {formatDate(request.start_date)} — {formatDate(request.end_date)} · {request.total_days} day{request.total_days !== 1 ? "s" : ""}
          </p>
        </div>
        <Badge
          variant={STATUS_VARIANTS[request.status] ?? "outline"}
          className="ml-auto text-sm px-3 py-1"
        >
          {request.status}
        </Badge>
      </div>

      <Separator />

      {/* Details Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Employee</p>
          <p className="mt-1 font-semibold">
            {request.profiles?.first_name} {request.profiles?.last_name}
          </p>
          <p className="text-xs text-muted-foreground">{dept}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Leave Type</p>
          <p className="mt-1 font-semibold">{request.leave_types?.name ?? "—"}</p>
          <p className="text-xs text-muted-foreground">{request.leave_types?.code ?? ""}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Date Range</p>
          <p className="mt-1 font-semibold">{formatDate(request.start_date)}</p>
          <p className="text-xs text-muted-foreground">to {formatDate(request.end_date)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Total Days</p>
          <p className="mt-1 text-3xl font-bold">{request.total_days}</p>
        </div>
      </div>

      {/* Reason */}
      {request.reason && (
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground mb-1">Reason</p>
          <p className="text-sm">{request.reason}</p>
        </div>
      )}

      {/* Metadata */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Filed On</p>
          <p className="mt-1 font-medium">{formatDate(request.created_at)}</p>
        </div>
        <div className="rounded-lg border p-4">
          <p className="text-xs text-muted-foreground">Status</p>
          <div className="mt-1">
            <Badge variant={STATUS_VARIANTS[request.status] ?? "outline"} className="text-sm">
              {request.status}
            </Badge>
          </div>
        </div>
      </div>

      {/* Actions */}
      {isOwner && request.status === "pending" && (
        <>
          <Separator />
          <div className="flex items-center gap-2">
            <Button variant="destructive" onClick={handleCancel}>
              Cancel Request
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

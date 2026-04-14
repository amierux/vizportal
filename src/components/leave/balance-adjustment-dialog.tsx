"use client";

import { useActionState, useEffect } from "react";
import { adjustLeaveBalance } from "@/lib/actions/leave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";

type BalanceAdjustmentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: {
    id: string;
    total_days: number;
    used_days: number;
    remaining_days: number;
    employeeName: string;
    leaveTypeName: string;
  } | null;
};

export function BalanceAdjustmentDialog({
  open,
  onOpenChange,
  balance,
}: BalanceAdjustmentDialogProps) {
  const [state, formAction, isPending] = useActionState(adjustLeaveBalance, null);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Balance adjusted");
      onOpenChange(false);
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state, onOpenChange]);

  if (!balance) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            Adjust Balance — {balance.employeeName} ({balance.leaveTypeName})
          </DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="_balanceId" value={balance.id} />
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Total Days</Label>
              <Input
                name="total_days"
                type="number"
                step="0.5"
                defaultValue={balance.total_days}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Used Days</Label>
              <Input
                name="used_days"
                type="number"
                step="0.5"
                defaultValue={balance.used_days}
                required
              />
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Current remaining: {balance.remaining_days} days
          </p>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Saving..." : "Adjust Balance"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

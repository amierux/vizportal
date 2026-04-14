"use client";

import { useActionState, useEffect, useState } from "react";
import { fileLeaveRequest } from "@/lib/actions/leave";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { LeaveType } from "@/types";

type LeaveRequestFormProps = {
  leaveTypes: LeaveType[];
};

export function LeaveRequestForm({ leaveTypes }: LeaveRequestFormProps) {
  const [state, formAction, isPending] = useActionState(fileLeaveRequest, null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Leave request submitted for approval");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  const activeTypes = leaveTypes.filter((t) => t.is_active);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants())} onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        File Leave
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>File Leave Request</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select name="leave_type_id" required>
              <SelectTrigger>
                <SelectValue placeholder="Select leave type" />
              </SelectTrigger>
              <SelectContent>
                {activeTypes.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.name} ({t.code})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input name="start_date" type="date" required />
            </div>
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input name="end_date" type="date" required />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Textarea name="reason" placeholder="Reason for leave..." rows={3} />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Submitting..." : "Submit Leave Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

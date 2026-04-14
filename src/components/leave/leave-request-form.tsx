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
import { RelieverInput } from "@/components/leave/reliever-input";

type User = { id: string; first_name: string | null; last_name: string | null };

type LeaveRequestFormProps = {
  leaveTypes: LeaveType[];
  users: User[];
};

export function LeaveRequestForm({ leaveTypes, users }: LeaveRequestFormProps) {
  const [state, formAction, isPending] = useActionState(fileLeaveRequest, null);
  const [open, setOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [relieverCount, setRelieverCount] = useState(1);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Leave request submitted for approval");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      setSelectedTypeId("");
      setRelieverCount(1);
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  const activeTypes = leaveTypes.filter((t) => t.is_active);
  const selectedType = activeTypes.find((t) => t.id === selectedTypeId);
  const requiresReliever = selectedType?.requires_reliever ?? false;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants())} onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        File Leave
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>File Leave Request</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label>Leave Type</Label>
            <Select
              name="leave_type_id"
              required
              value={selectedTypeId}
              onValueChange={(v) => {
                setSelectedTypeId(v ?? "");
                setRelieverCount(1);
              }}
            >
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

          {requiresReliever && (
            <div className="space-y-3">
              <Label className="text-sm font-semibold">Relievers</Label>
              {Array.from({ length: relieverCount }).map((_, i) => (
                <RelieverInput
                  key={i}
                  index={i}
                  users={users}
                  canRemove={relieverCount > 1}
                  onRemove={() => setRelieverCount((c) => c - 1)}
                />
              ))}
              {relieverCount < 3 && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setRelieverCount((c) => c + 1)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add Reliever
                </Button>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="attachment">Attachment (optional)</Label>
            <Input id="attachment" name="attachment" type="file" accept="image/*,.pdf,.doc,.docx" />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Submitting..." : "Submit Leave Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

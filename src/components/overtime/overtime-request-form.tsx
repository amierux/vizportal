"use client";

import { useActionState, useEffect, useState } from "react";
import { fileOvertimeRequest } from "@/lib/actions/overtime";
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
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";

export function OvertimeRequestForm() {
  const [state, formAction, isPending] = useActionState(fileOvertimeRequest, null);
  const [open, setOpen] = useState(false);
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Overtime request submitted for approval");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      setStartTime("");
      setEndTime("");
    }
    if (state && "error" in state) toast.error(state.error as string);
  }, [state]);

  function calcHours(): string {
    if (!startTime || !endTime) return "";
    const [sH, sM] = startTime.split(":").map(Number);
    const [eH, eM] = endTime.split(":").map(Number);
    let diff = (eH + eM / 60) - (sH + sM / 60);
    if (diff < 0) diff += 24;
    return `${Math.round(diff * 100) / 100}h`;
  }

  const computedHours = calcHours();

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants())} onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        File Overtime
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>File Overtime Request</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input name="date" type="date" required />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                name="start_time"
                type="time"
                required
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                name="end_time"
                type="time"
                required
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
              />
            </div>
          </div>

          {computedHours && (
            <p className="text-sm text-muted-foreground">
              Total hours: <span className="font-medium text-foreground">{computedHours}</span>
            </p>
          )}

          <div className="space-y-2">
            <Label>Reason</Label>
            <Textarea name="reason" placeholder="Reason for overtime..." rows={3} required />
          </div>

          <div className="space-y-2">
            <Label>Attachment URL (optional)</Label>
            <Input name="attachment_url" type="url" placeholder="https://..." />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Submitting..." : "Submit Overtime Request"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

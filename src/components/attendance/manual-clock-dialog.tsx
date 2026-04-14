"use client";

import { useActionState, useEffect, useState } from "react";
import { submitManualClock } from "@/lib/actions/attendance";
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
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { FileEdit } from "lucide-react";

export function ManualClockDialog() {
  const [state, formAction, isPending] = useActionState(submitManualClock, null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Manual entry submitted for approval");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        <FileEdit className="mr-2 h-4 w-4" />
        File Manual Entry
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>File Manual Clock Entry</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input id="date" name="date" type="date" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" required>
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="clock_in">Clock In</SelectItem>
                <SelectItem value="clock_out">Clock Out</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="time">Time</Label>
            <Input id="time" name="time" type="time" required />
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason</Label>
            <Textarea
              id="reason"
              name="reason"
              placeholder="Why are you filing a manual entry?"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="attachment">Attachment (optional)</Label>
            <Input id="attachment" name="attachment" type="file" accept="image/*,.pdf,.doc,.docx" />
          </div>

          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Submitting..." : "Submit for Approval"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

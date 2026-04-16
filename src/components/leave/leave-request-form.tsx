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

type HalfMode = "full" | "am" | "pm";

export function LeaveRequestForm({ leaveTypes, users }: LeaveRequestFormProps) {
  const [state, formAction, isPending] = useActionState(fileLeaveRequest, null);
  const [open, setOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState<string>("");
  const [relieverCount, setRelieverCount] = useState(1);
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  // Start half-mode: "full" = whole start day; "pm" = only PM of start day (morning is work)
  const [startMode, setStartMode] = useState<HalfMode>("full");
  // End half-mode: "full" = whole end day; "am" = only AM of end day (afternoon is work)
  const [endMode, setEndMode] = useState<HalfMode>("full");

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Leave request submitted for approval");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      setSelectedTypeId("");
      setRelieverCount(1);
      setStartDate("");
      setEndDate("");
      setStartMode("full");
      setEndMode("full");
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  const activeTypes = leaveTypes.filter((t) => t.is_active);
  const selectedType = activeTypes.find((t) => t.id === selectedTypeId);
  const requiresReliever = selectedType?.requires_reliever ?? false;

  const isSameDay = startDate && endDate && startDate === endDate;

  // Live days preview
  const daysPreview = (() => {
    if (!startDate || !endDate) return null;
    if (isSameDay) {
      if (startMode === "full" && endMode === "full") return 1;
      // Same-day half: either AM or PM only
      if ((startMode === "am" && endMode !== "pm") || (endMode === "am" && startMode !== "pm")) return 0.5;
      if ((startMode === "pm" && endMode !== "am") || (endMode === "pm" && startMode !== "am")) return 0.5;
      return 0.5;
    }
    // Multi-day: approximate calendar day count (server computes workdays)
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    if (ms < 0) return null;
    let d = Math.floor(ms / 86400000) + 1;
    if (startMode === "pm") d -= 0.5;
    if (endMode === "am") d -= 0.5;
    return d;
  })();

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

          {/* Start date + start half-mode */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Input
                name="start_date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Start</Label>
              <Select
                value={startMode}
                onValueChange={(v) => setStartMode((v ?? "full") as HalfMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Day</SelectItem>
                  {isSameDay ? (
                    <>
                      <SelectItem value="am">AM Only</SelectItem>
                      <SelectItem value="pm">PM Only</SelectItem>
                    </>
                  ) : (
                    <SelectItem value="pm">PM Only (afternoon)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* End date + end half-mode */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>End Date</Label>
              <Input
                name="end_date"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label>End</Label>
              <Select
                value={endMode}
                onValueChange={(v) => setEndMode((v ?? "full") as HalfMode)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="full">Full Day</SelectItem>
                  {isSameDay ? (
                    <>
                      <SelectItem value="am">AM Only</SelectItem>
                      <SelectItem value="pm">PM Only</SelectItem>
                    </>
                  ) : (
                    <SelectItem value="am">AM Only (morning)</SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Hidden fields with the actual values the server validates */}
          {startMode !== "full" && (
            <input type="hidden" name="start_half" value={startMode} />
          )}
          {endMode !== "full" && (
            <input type="hidden" name="end_half" value={endMode} />
          )}

          {daysPreview !== null && (
            <p className="text-xs text-muted-foreground">
              Estimated: <span className="font-medium text-foreground">{daysPreview} day{daysPreview === 1 ? "" : "s"}</span> will be deducted.
            </p>
          )}

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

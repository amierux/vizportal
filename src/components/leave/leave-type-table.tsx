"use client";

import { useActionState, useEffect, useState } from "react";
import { createLeaveType, updateLeaveType, toggleLeaveTypeActive, toggleLeaveTypeReliever } from "@/lib/actions/leave-types";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
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
import { Plus, Pencil } from "lucide-react";
import { LEAVE_GENDER_OPTIONS } from "@/lib/constants";
import type { LeaveType } from "@/types";

type LeaveTypeTableProps = {
  leaveTypes: LeaveType[];
};

export function LeaveTypeTable({ leaveTypes }: LeaveTypeTableProps) {
  const [createState, createAction, isCreating] = useActionState(createLeaveType, null);
  const [updateState, updateAction, isUpdating] = useActionState(updateLeaveType, null);
  const [createOpen, setCreateOpen] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);

  useEffect(() => {
    if (createState && "success" in createState) {
      toast.success("Leave type created");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCreateOpen(false);
    }
    if (createState && "error" in createState) toast.error(createState.error);
  }, [createState]);

  useEffect(() => {
    if (updateState && "success" in updateState) {
      toast.success("Leave type updated");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditId(null);
    }
    if (updateState && "error" in updateState) toast.error(updateState.error);
  }, [updateState]);

  async function handleToggle(id: string, current: boolean) {
    const result = await toggleLeaveTypeActive(id, !current);
    if ("error" in result) toast.error(result.error);
    else toast.success(current ? "Leave type deactivated" : "Leave type activated");
  }

  async function handleRelieverToggle(id: string, current: boolean) {
    const result = await toggleLeaveTypeReliever(id, !current);
    if ("error" in result) toast.error(result.error);
    else toast.success(current ? "Reliever requirement removed" : "Reliever requirement enabled");
  }

  const editType = editId ? leaveTypes.find((t) => t.id === editId) : null;

  function renderForm(action: typeof createAction, defaultValues?: LeaveType, pending?: boolean) {
    return (
      <form action={action} className="space-y-4">
        {defaultValues && <input type="hidden" name="_id" value={defaultValues.id} />}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input name="name" defaultValue={defaultValues?.name ?? ""} required />
          </div>
          <div className="space-y-2">
            <Label>Code</Label>
            <Input name="code" defaultValue={defaultValues?.code ?? ""} required />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>Default Days</Label>
            <Input name="default_days" type="number" step="0.5" defaultValue={defaultValues?.default_days ?? 5} required />
          </div>
          <div className="space-y-2">
            <Label>Gender</Label>
            <Select name="applicable_gender" defaultValue={defaultValues?.applicable_gender ?? "all"}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {LEAVE_GENDER_OPTIONS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="hidden" name="is_paid" value="false" />
            <input type="checkbox" name="is_paid" value="true" defaultChecked={defaultValues?.is_paid ?? true} />
            Paid
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="hidden" name="requires_attachment" value="false" />
            <input type="checkbox" name="requires_attachment" value="true" defaultChecked={defaultValues?.requires_attachment ?? false} />
            Requires Attachment
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="hidden" name="requires_reliever" value="false" />
            <input type="checkbox" name="requires_reliever" value="true" defaultChecked={defaultValues?.requires_reliever ?? false} />
            Requires Reliever
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="hidden" name="is_carry_over" value="false" />
            <input type="checkbox" name="is_carry_over" value="true" defaultChecked={defaultValues?.is_carry_over ?? false} />
            Carry Over
          </label>
        </div>
        <div className="space-y-2">
          <Label>Max Carry Over Days</Label>
          <Input name="max_carry_over_days" type="number" step="0.5" defaultValue={defaultValues?.max_carry_over_days ?? 0} />
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Saving..." : defaultValues ? "Update" : "Create"}
        </Button>
      </form>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger className={cn(buttonVariants({ size: "sm" }))} onClick={() => setCreateOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />Add Leave Type
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>New Leave Type</DialogTitle></DialogHeader>
            {renderForm(createAction, undefined, isCreating)}
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Code</TableHead>
            <TableHead>Days</TableHead>
            <TableHead>Gender</TableHead>
            <TableHead>Paid</TableHead>
            <TableHead>Reliever</TableHead>
            <TableHead>Carry Over</TableHead>
            <TableHead>Status</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {leaveTypes.map((t) => (
            <TableRow key={t.id} className="row-hover">
              <TableCell>{t.name}</TableCell>
              <TableCell><Badge variant="outline">{t.code}</Badge></TableCell>
              <TableCell>{t.default_days}</TableCell>
              <TableCell className="capitalize">{t.applicable_gender}</TableCell>
              <TableCell>{t.is_paid ? "Yes" : "No"}</TableCell>
              <TableCell>
                <Badge
                  variant={t.requires_reliever ? "default" : "secondary"}
                  className="cursor-pointer"
                  onClick={() => handleRelieverToggle(t.id, t.requires_reliever)}
                >
                  {t.requires_reliever ? "Yes" : "No"}
                </Badge>
              </TableCell>
              <TableCell>{t.is_carry_over ? `Yes (max ${t.max_carry_over_days})` : "No"}</TableCell>
              <TableCell>
                <Badge variant={t.is_active ? "default" : "secondary"} className="cursor-pointer" onClick={() => handleToggle(t.id, t.is_active)}>
                  {t.is_active ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>
                <Button variant="ghost" size="icon" onClick={() => setEditId(t.id)}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Edit Leave Type</DialogTitle></DialogHeader>
          {editType && renderForm(updateAction, editType, isUpdating)}
        </DialogContent>
      </Dialog>
    </div>
  );
}

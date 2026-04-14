"use client";

import { useActionState, useEffect, useState } from "react";
import { createNonWorkingDay, deleteNonWorkingDay } from "@/lib/actions/non-working-days";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { formatDate } from "@/lib/utils/format";
import { COUNTRY_OPTIONS } from "@/lib/utils/timezone";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import type { NonWorkingDay } from "@/types";

type NonWorkingDaysTableProps = {
  days: NonWorkingDay[];
};

export function NonWorkingDaysTable({ days }: NonWorkingDaysTableProps) {
  const [state, formAction, isPending] = useActionState(createNonWorkingDay, null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Non-working day added");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  async function handleDelete(id: string) {
    const result = await deleteNonWorkingDay(id);
    if ("error" in result) toast.error(result.error);
    else toast.success("Deleted");
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className={cn(buttonVariants({ size: "sm" }))}>
            <Plus className="mr-2 h-4 w-4" />Add Non-Working Day
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Add Non-Working Day</DialogTitle></DialogHeader>
            <form action={formAction} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" placeholder="e.g., Christmas Day" required />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input name="date" type="date" required />
              </div>
              <div className="space-y-2">
                <Label>Country</Label>
                <Select name="country" defaultValue="PH">
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {COUNTRY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <label className="flex items-center gap-2 text-sm">
                <input type="hidden" name="is_recurring" value="false" />
                <input type="checkbox" name="is_recurring" value="true" className="rounded" />
                Repeats every year
              </label>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Adding..." : "Add"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Country</TableHead>
            <TableHead>Recurring</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {days.length === 0 ? (
            <TableRow>
              <TableCell colSpan={5} className="text-center text-muted-foreground">
                No non-working days configured
              </TableCell>
            </TableRow>
          ) : (
            days.map((d) => (
              <TableRow key={d.id}>
                <TableCell>{d.name}</TableCell>
                <TableCell>{formatDate(d.date)}</TableCell>
                <TableCell><Badge variant="outline">{d.country}</Badge></TableCell>
                <TableCell>{d.is_recurring ? "Yes" : "No"}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
}

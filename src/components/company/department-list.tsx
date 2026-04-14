"use client";

import { useState } from "react";
import {
  createDepartment,
  updateDepartment,
  deleteDepartment,
} from "@/lib/actions/departments";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { buttonVariants } from "@/components/ui/button";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { Profile } from "@/types";
import { formatFullName } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

type DepartmentRow = {
  id: string;
  name: string;
  manager_id: string | null;
  team_leader_id: string | null;
};

type DepartmentListProps = {
  departments: DepartmentRow[];
  members: Pick<Profile, "id" | "first_name" | "last_name">[];
};

export function DepartmentList({ departments, members }: DepartmentListProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = editingId
      ? await updateDepartment(editingId, formData)
      : await createDepartment(formData);

    if (result.error) {
      toast.error(result.error);
    } else {
      toast.success(editingId ? "Department updated" : "Department created");
      setIsOpen(false);
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this department?")) return;
    const result = await deleteDepartment(id);
    if (result.error) toast.error(result.error);
    else toast.success("Department deleted");
  }

  const editingDept = editingId
    ? departments.find((d) => d.id === editingId)
    : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium">Departments</h3>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setEditingId(null);
          }}
        >
          <DialogTrigger
            className={cn(buttonVariants({ size: "sm" }))}
            onClick={() => { setEditingId(null); setIsOpen(true); }}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Department
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingId ? "Edit Department" : "Add Department"}
              </DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="dept-name">Name</Label>
                <Input
                  id="dept-name"
                  name="name"
                  defaultValue={editingDept?.name ?? ""}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Manager</Label>
                <Select name="manager_id" defaultValue={editingDept?.manager_id ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Manager" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {formatFullName(m.first_name, m.last_name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Team Leader</Label>
                <Select name="team_leader_id" defaultValue={editingDept?.team_leader_id ?? ""}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Team Leader" />
                  </SelectTrigger>
                  <SelectContent>
                    {members.map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {formatFullName(m.first_name, m.last_name)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Button type="submit" className="w-full">
                {editingId ? "Update" : "Create"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Manager</TableHead>
              <TableHead>Team Leader</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {departments.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No departments yet
                </TableCell>
              </TableRow>
            )}
            {departments.map((dept) => (
              <TableRow key={dept.id} className="row-hover">
                <TableCell className="font-medium">{dept.name}</TableCell>
                <TableCell>
                  {dept.manager_id
                    ? formatFullName(
                        members.find((m) => m.id === dept.manager_id)?.first_name ?? null,
                        members.find((m) => m.id === dept.manager_id)?.last_name ?? null
                      )
                    : "—"}
                </TableCell>
                <TableCell>
                  {dept.team_leader_id
                    ? formatFullName(
                        members.find((m) => m.id === dept.team_leader_id)?.first_name ?? null,
                        members.find((m) => m.id === dept.team_leader_id)?.last_name ?? null
                      )
                    : "—"}
                </TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingId(dept.id);
                        setIsOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(dept.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

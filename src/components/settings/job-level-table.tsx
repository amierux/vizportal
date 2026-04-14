"use client";

import { useState } from "react";
import { createJobLevel, updateJobLevel, deleteJobLevel } from "@/lib/actions/job-levels";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { JobLevel } from "@/types";

type JobLevelTableProps = { jobLevels: JobLevel[] };

export function JobLevelTable({ jobLevels }: JobLevelTableProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  async function handleSubmit(formData: FormData) {
    const result = editingId
      ? await updateJobLevel(editingId, formData)
      : await createJobLevel(null, formData);
    if (result.error) toast.error(result.error);
    else {
      toast.success(editingId ? "Updated" : "Created");
      setIsOpen(false);
      setEditingId(null);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this job level?")) return;
    const result = await deleteJobLevel(id);
    if (result.error) toast.error(result.error);
    else toast.success("Deleted");
  }

  const editing = editingId ? jobLevels.find((jl) => jl.id === editingId) : null;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-medium">Job Levels</h3>
        <Dialog
          open={isOpen}
          onOpenChange={(open) => {
            setIsOpen(open);
            if (!open) setEditingId(null);
          }}
        >
          <DialogTrigger
            className={cn(buttonVariants({ size: "sm" }))}
            onClick={() => setIsOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Add Level
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit" : "Add"} Job Level</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Code</Label>
                <Input name="code" defaultValue={editing?.code ?? ""} placeholder="e.g. A1" required />
              </div>
              <div className="space-y-2">
                <Label>Name</Label>
                <Input name="name" defaultValue={editing?.name ?? ""} placeholder="e.g. Entry Level" required />
              </div>
              <div className="space-y-2">
                <Label>Rank</Label>
                <Input name="rank" type="number" defaultValue={editing?.rank ?? ""} min="0" required />
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
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Rank</TableHead>
              <TableHead className="w-24">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {jobLevels.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-muted-foreground">
                  No job levels defined
                </TableCell>
              </TableRow>
            )}
            {jobLevels.map((jl) => (
              <TableRow key={jl.id} className="row-hover">
                <TableCell className="font-mono font-medium">{jl.code}</TableCell>
                <TableCell>{jl.name}</TableCell>
                <TableCell>{jl.rank}</TableCell>
                <TableCell>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingId(jl.id);
                        setIsOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(jl.id)}
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

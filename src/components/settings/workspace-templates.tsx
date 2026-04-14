"use client";

import { useState } from "react";
import { createChecklistTemplate, deleteChecklistTemplate, deleteListTemplate } from "@/lib/actions/workspace-templates";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

type ChecklistTemplate = {
  id: string;
  name: string;
  items: unknown;
  created_by: string | null;
  created_at: string;
};

type ListTemplate = {
  id: string;
  name: string;
  template_data: unknown;
  created_by: string | null;
  created_at: string;
};

type WorkspaceTemplatesProps = {
  checklistTemplates: ChecklistTemplate[];
  listTemplates: ListTemplate[];
};

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function WorkspaceTemplates({ checklistTemplates, listTemplates }: WorkspaceTemplatesProps) {
  const [isChecklistOpen, setIsChecklistOpen] = useState(false);

  async function handleCreateChecklist(formData: FormData) {
    const linesRaw = formData.get("items_text") as string;
    const lines = (linesRaw ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    const items = lines.map((name, position) => ({ name, position }));

    const newFormData = new FormData();
    newFormData.set("name", formData.get("name") as string);
    newFormData.set("items", JSON.stringify(items));

    const result = await createChecklistTemplate(null, newFormData);
    if (result?.error) toast.error(result.error);
    else {
      toast.success("Checklist template created");
      setIsChecklistOpen(false);
    }
  }

  async function handleDeleteChecklist(id: string) {
    if (!confirm("Delete this checklist template?")) return;
    const result = await deleteChecklistTemplate(id);
    if (result?.error) toast.error(result.error);
    else toast.success("Deleted");
  }

  async function handleDeleteList(id: string) {
    if (!confirm("Delete this list template?")) return;
    const result = await deleteListTemplate(id);
    if (result?.error) toast.error(result.error);
    else toast.success("Deleted");
  }

  return (
    <div className="space-y-8">
      {/* ── Checklist Templates ── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Checklist Templates</h2>
          <Dialog open={isChecklistOpen} onOpenChange={setIsChecklistOpen}>
            <DialogTrigger className={cn(buttonVariants({ size: "sm" }))}>
              <Plus className="mr-2 h-4 w-4" /> Add Template
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Checklist Template</DialogTitle>
              </DialogHeader>
              <form action={handleCreateChecklist} className="space-y-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input name="name" placeholder="e.g. Onboarding Checklist" required />
                </div>
                <div className="space-y-2">
                  <Label>Items</Label>
                  <Textarea
                    name="items_text"
                    placeholder={"Complete paperwork\nSet up workstation\nIntroduce to team"}
                    rows={6}
                  />
                  <p className="text-xs text-muted-foreground">One item per line.</p>
                </div>
                <Button type="submit" className="w-full">
                  Create Template
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
                <TableHead className="w-28">Items</TableHead>
                <TableHead className="w-36">Created At</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {checklistTemplates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    No checklist templates yet
                  </TableCell>
                </TableRow>
              )}
              {checklistTemplates.map((t) => (
                <TableRow key={t.id} className="row-hover">
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell>{Array.isArray(t.items) ? (t.items as unknown[]).length : 0}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteChecklist(t.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* ── List Templates ── */}
      <div>
        <div className="mb-4">
          <h2 className="text-lg font-semibold">List Templates</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            List templates are created via &quot;Save as Template&quot; from within a list.
          </p>
        </div>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead className="w-36">Created At</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {listTemplates.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No list templates yet
                  </TableCell>
                </TableRow>
              )}
              {listTemplates.map((t) => (
                <TableRow key={t.id} className="row-hover">
                  <TableCell className="font-medium">{t.name}</TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(t.created_at)}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteList(t.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}

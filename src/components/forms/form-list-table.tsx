"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createForm, publishForm, archiveForm, deleteForm } from "@/lib/actions/forms";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { formatDate } from "@/lib/utils/format";
import {
  Plus,
  MoreHorizontal,
  Pencil,
  Globe,
  Archive,
  Trash2,
  FileText,
  Eye,
} from "lucide-react";

type FormWithCount = {
  id: string;
  name: string;
  description?: string | null;
  status: "draft" | "published" | "archived";
  created_at: string;
  form_submissions?: { count: number }[];
};

type FormListTableProps = {
  forms: FormWithCount[];
};

const STATUS_BADGES: Record<string, { label: string; variant: "default" | "secondary" | "outline" | "destructive" }> = {
  draft: { label: "Draft", variant: "outline" },
  published: { label: "Published", variant: "default" },
  archived: { label: "Archived", variant: "secondary" },
};

export function FormListTable({ forms }: FormListTableProps) {
  const router = useRouter();
  const [state, formAction, isPending] = useActionState(createForm, null);
  const [open, setOpen] = useState(false);
  const [actionPending, startTransition] = useTransition();

  useEffect(() => {
    if (state && "success" in state && "formId" in state) {
      toast.success("Form created");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      router.push(`/forms/builder/${state.formId}`);
    }
    if (state && "error" in state) toast.error((state as { error: string }).error);
  }, [state, router]);

  function handlePublish(formId: string) {
    startTransition(async () => {
      const result = await publishForm(formId);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Form published");
    });
  }

  function handleArchive(formId: string) {
    startTransition(async () => {
      const result = await archiveForm(formId);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Form archived");
    });
  }

  function handleDelete(formId: string) {
    if (!confirm("Delete this form? All submissions will be lost.")) return;
    startTransition(async () => {
      const result = await deleteForm(formId);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Form deleted");
    });
  }

  return (
    <div className="space-y-4 animate-fade-in-up">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Forms</h2>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger
            className={cn(buttonVariants({ size: "sm" }))}
          >
            <Plus className="mr-2 h-4 w-4" />
            Create Form
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create Form</DialogTitle>
            </DialogHeader>
            <form action={formAction} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" placeholder="Form name" required />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input id="description" name="description" placeholder="Optional" />
              </div>
              <Button type="submit" className="w-full" disabled={isPending}>
                {isPending ? "Creating..." : "Create & Open Builder"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {forms.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border rounded-lg">
          <FileText className="h-12 w-12 text-muted-foreground" />
          <p className="mt-4 text-lg font-medium">No forms yet</p>
          <p className="text-sm text-muted-foreground">Create your first form to get started.</p>
        </div>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Submissions</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-10" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {forms.map((form) => {
                const statusInfo = STATUS_BADGES[form.status] ?? STATUS_BADGES.draft;
                const count = form.form_submissions?.[0]?.count ?? 0;

                return (
                  <TableRow key={form.id} className="animate-stagger">
                    <TableCell>
                      <div>
                        <p className="font-medium">{form.name}</p>
                        {form.description && (
                          <p className="text-xs text-muted-foreground truncate max-w-xs">
                            {form.description}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{count}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">
                      {formatDate(form.created_at)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }), "h-8 w-8")} disabled={actionPending}>
                          <MoreHorizontal className="h-4 w-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => router.push(`/forms/builder/${form.id}`)}>
                            <Pencil className="mr-2 h-4 w-4" />
                            Edit Builder
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => router.push(`/forms/${form.id}/submissions`)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Submissions
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {form.status !== "published" && (
                            <DropdownMenuItem onClick={() => handlePublish(form.id)}>
                              <Globe className="mr-2 h-4 w-4" />
                              Publish
                            </DropdownMenuItem>
                          )}
                          {form.status !== "archived" && (
                            <DropdownMenuItem onClick={() => handleArchive(form.id)}>
                              <Archive className="mr-2 h-4 w-4" />
                              Archive
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDelete(form.id)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}

"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { createList, createListFromTemplate } from "@/lib/actions/workspace-lists";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { Plus } from "lucide-react";

type Template = {
  id: string;
  name: string;
};

type ListCreateDialogProps = {
  folderId: string;
  templates?: Template[];
};

export function ListCreateDialog({ folderId, templates = [] }: ListCreateDialogProps) {
  const [state, formAction, isPending] = useActionState(createList, null);
  const [open, setOpen] = useState(false);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>("");
  const [isTemplateCreating, startTransition] = useTransition();

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("List created");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
      setSelectedTemplateId("");
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  function handleTemplateCreate() {
    if (!selectedTemplateId) return;
    startTransition(async () => {
      const result = await createListFromTemplate(folderId, selectedTemplateId);
      if (result && "error" in result) toast.error(result.error);
      else {
        toast.success("List created from template");
        setOpen(false);
        setSelectedTemplateId("");
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "w-full justify-start")}>
        <Plus className="mr-2 h-3.5 w-3.5" />
        Add List
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create List</DialogTitle>
        </DialogHeader>

        {/* From Template Section */}
        {templates.length > 0 && (
          <div className="space-y-3 pb-4 border-b">
            <Label>From Template</Label>
            <div className="flex gap-2">
              <Select value={selectedTemplateId} onValueChange={(v) => setSelectedTemplateId(v ?? "")}>
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a template..." />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                onClick={handleTemplateCreate}
                disabled={!selectedTemplateId || isTemplateCreating}
              >
                {isTemplateCreating ? "Creating..." : "Use"}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Or create a blank list below
            </p>
          </div>
        )}

        {/* Blank List Form */}
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="folder_id" value={folderId} />
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" placeholder="List name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="Optional" />
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creating..." : "Create List"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { createFolder } from "@/lib/actions/workspace-folders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { FolderPlus } from "lucide-react";

export function FolderCreateDialog() {
  const [state, formAction, isPending] = useActionState(createFolder, null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Folder created");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOpen(false);
    }
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ size: "sm" }))}>
        <FolderPlus className="mr-2 h-4 w-4" />
        New Folder
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Folder</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" placeholder="Folder name" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Input id="description" name="description" placeholder="Optional description" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="color">Color</Label>
              <Input id="color" name="color" type="color" defaultValue="#6366f1" className="h-10 cursor-pointer" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="icon">Icon (emoji)</Label>
              <Input id="icon" name="icon" placeholder="📁" defaultValue="📁" maxLength={2} />
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={isPending}>
            {isPending ? "Creating..." : "Create Folder"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}

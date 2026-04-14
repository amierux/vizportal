"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import {
  updateFolder,
  addFolderMember,
  removeFolderMember,
  updateFolderMemberPermission,
  addFolderStatus,
  updateFolderStatus,
  deleteFolderStatus,
  reorderFolderStatuses,
} from "@/lib/actions/workspace-folders";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { toast } from "sonner";
import { Settings, Trash2, ChevronUp, ChevronDown, UserPlus, X } from "lucide-react";
import { formatFullName } from "@/lib/utils/format";

type Member = {
  profile_id: string;
  permission: "viewer" | "creator" | "editor" | "admin";
  profiles: {
    id: string;
    first_name: string | null;
    last_name: string | null;
    avatar_url: string | null;
    email: string | null;
  } | null;
};

type Status = {
  id: string;
  name: string;
  color: string;
  position: number;
  is_done: boolean;
  requires_approval: boolean;
};

type CompanyMember = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

type FolderSettingsDialogProps = {
  folder: {
    id: string;
    name: string;
    description: string | null;
    color: string;
    icon: string;
    workspace_folder_members: Member[];
    workspace_folder_statuses: Status[];
  };
  companyMembers: CompanyMember[];
};

export function FolderSettingsDialog({ folder, companyMembers }: FolderSettingsDialogProps) {
  const [open, setOpen] = useState(false);
  const [generalState, generalAction, isGeneralPending] = useActionState(updateFolder, null);
  const [statusState, statusAction, isStatusPending] = useActionState(addFolderStatus, null);
  const [isPending, startTransition] = useTransition();
  const [addMemberSearch, setAddMemberSearch] = useState("");
  const [newStatusName, setNewStatusName] = useState("");
  const [newStatusColor, setNewStatusColor] = useState("#6366f1");
  const [statuses, setStatuses] = useState<Status[]>(folder.workspace_folder_statuses);

  useEffect(() => {
    if (generalState && "success" in generalState) toast.success("Folder updated");
    if (generalState && "error" in generalState) toast.error(generalState.error);
  }, [generalState]);

  useEffect(() => {
    if (statusState && "success" in statusState) {
      toast.success("Status added");
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setNewStatusName("");
    }
    if (statusState && "error" in statusState) toast.error(statusState.error);
  }, [statusState]);

  const existingMemberIds = folder.workspace_folder_members.map((m) => m.profile_id);
  const filteredMembers = companyMembers.filter(
    (m) =>
      !existingMemberIds.includes(m.id) &&
      (addMemberSearch === "" ||
        formatFullName(m.first_name, m.last_name)
          .toLowerCase()
          .includes(addMemberSearch.toLowerCase()) ||
        m.email?.toLowerCase().includes(addMemberSearch.toLowerCase()))
  );

  function handleAddMember(profileId: string) {
    startTransition(async () => {
      const result = await addFolderMember(folder.id, profileId, "viewer");
      if (result && "error" in result) toast.error(result.error);
      else {
        toast.success("Member added");
        setAddMemberSearch("");
      }
    });
  }

  function handleRemoveMember(profileId: string) {
    startTransition(async () => {
      const result = await removeFolderMember(folder.id, profileId);
      if (result && "error" in result) toast.error(result.error);
      else toast.success("Member removed");
    });
  }

  function handlePermissionChange(
    profileId: string,
    permission: "viewer" | "creator" | "editor" | "admin"
  ) {
    startTransition(async () => {
      const result = await updateFolderMemberPermission(folder.id, profileId, permission);
      if (result && "error" in result) toast.error(result.error);
    });
  }

  function handleDeleteStatus(statusId: string) {
    startTransition(async () => {
      const result = await deleteFolderStatus(statusId);
      if (result && "error" in result) toast.error(result.error);
      else {
        toast.success("Status deleted");
        setStatuses((prev) => prev.filter((s) => s.id !== statusId));
      }
    });
  }

  function handleToggleStatusField(
    statusId: string,
    field: "is_done" | "requires_approval",
    value: boolean
  ) {
    startTransition(async () => {
      const result = await updateFolderStatus(statusId, { [field]: value });
      if (result && "error" in result) toast.error(result.error);
      else setStatuses((prev) => prev.map((s) => (s.id === statusId ? { ...s, [field]: value } : s)));
    });
  }

  function handleReorder(index: number, direction: "up" | "down") {
    const newStatuses = [...statuses];
    const target = direction === "up" ? index - 1 : index + 1;
    if (target < 0 || target >= newStatuses.length) return;
    [newStatuses[index], newStatuses[target]] = [newStatuses[target], newStatuses[index]];
    setStatuses(newStatuses);
    startTransition(async () => {
      await reorderFolderStatuses(
        folder.id,
        newStatuses.map((s) => s.id)
      );
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger className={cn(buttonVariants({ variant: "ghost", size: "icon" }))}>
        <Settings className="h-4 w-4" />
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Folder Settings — {folder.name}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="general">
          <TabsList>
            <TabsTrigger value="general">General</TabsTrigger>
            <TabsTrigger value="members">Members</TabsTrigger>
            <TabsTrigger value="statuses">Statuses</TabsTrigger>
          </TabsList>

          {/* General Tab */}
          <TabsContent value="general" className="mt-4">
            <form action={generalAction} className="space-y-4">
              <input type="hidden" name="folder_id" value={folder.id} />
              <div className="space-y-2">
                <Label htmlFor="name">Name *</Label>
                <Input id="name" name="name" defaultValue={folder.name} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  name="description"
                  defaultValue={folder.description ?? ""}
                  placeholder="Optional"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="color">Color</Label>
                  <Input
                    id="color"
                    name="color"
                    type="color"
                    defaultValue={folder.color}
                    className="h-10 cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="icon">Icon (emoji)</Label>
                  <Input
                    id="icon"
                    name="icon"
                    defaultValue={folder.icon}
                    maxLength={2}
                  />
                </div>
              </div>
              <Button type="submit" disabled={isGeneralPending}>
                {isGeneralPending ? "Saving..." : "Save Changes"}
              </Button>
            </form>
          </TabsContent>

          {/* Members Tab */}
          <TabsContent value="members" className="mt-4 space-y-4">
            <div className="relative">
              <Input
                placeholder="Search members to add..."
                value={addMemberSearch}
                onChange={(e) => setAddMemberSearch(e.target.value)}
              />
              {addMemberSearch && filteredMembers.length > 0 && (
                <div className="absolute z-10 mt-1 w-full rounded-md border bg-popover shadow-lg">
                  {filteredMembers.slice(0, 8).map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-muted"
                      onClick={() => handleAddMember(m.id)}
                    >
                      <UserPlus className="h-3 w-3 text-muted-foreground" />
                      <span>{formatFullName(m.first_name, m.last_name)}</span>
                      {m.email && (
                        <span className="text-muted-foreground text-xs ml-auto">{m.email}</span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member</TableHead>
                  <TableHead>Permission</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {folder.workspace_folder_members.map((member) => (
                  <TableRow key={member.profile_id} className="row-hover">
                    <TableCell>
                      {member.profiles
                        ? formatFullName(member.profiles.first_name, member.profiles.last_name)
                        : "Unknown"}
                    </TableCell>
                    <TableCell>
                      <Select
                        defaultValue={member.permission}
                        onValueChange={(val) =>
                          handlePermissionChange(
                            member.profile_id,
                            val as "viewer" | "creator" | "editor" | "admin"
                          )
                        }
                      >
                        <SelectTrigger className="w-32 h-8">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="viewer">Viewer</SelectItem>
                          <SelectItem value="creator">Creator</SelectItem>
                          <SelectItem value="editor">Editor</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => handleRemoveMember(member.profile_id)}
                        disabled={isPending}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          {/* Statuses Tab */}
          <TabsContent value="statuses" className="mt-4 space-y-4">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Done</TableHead>
                  <TableHead>Needs Approval</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {statuses.map((status, index) => (
                  <TableRow key={status.id} className="row-hover">
                    <TableCell className="font-medium">{status.name}</TableCell>
                    <TableCell>
                      <span
                        className="inline-block h-5 w-5 rounded-full border"
                        style={{ backgroundColor: status.color }}
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={status.is_done}
                        onChange={(e) =>
                          handleToggleStatusField(status.id, "is_done", e.target.checked)
                        }
                        className="h-4 w-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      <input
                        type="checkbox"
                        checked={status.requires_approval}
                        onChange={(e) =>
                          handleToggleStatusField(
                            status.id,
                            "requires_approval",
                            e.target.checked
                          )
                        }
                        className="h-4 w-4 cursor-pointer"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleReorder(index, "up")}
                          disabled={index === 0 || isPending}
                        >
                          <ChevronUp className="h-3 w-3" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => handleReorder(index, "down")}
                          disabled={index === statuses.length - 1 || isPending}
                        >
                          <ChevronDown className="h-3 w-3" />
                        </Button>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteStatus(status.id)}
                        disabled={isPending}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {/* Add Status */}
            <form action={statusAction} className="flex gap-2">
              <input type="hidden" name="folder_id" value={folder.id} />
              <input type="hidden" name="is_done" value="false" />
              <input type="hidden" name="requires_approval" value="false" />
              <Input
                name="name"
                placeholder="Status name"
                value={newStatusName}
                onChange={(e) => setNewStatusName(e.target.value)}
                required
                className="flex-1"
              />
              <Input
                name="color"
                type="color"
                value={newStatusColor}
                onChange={(e) => setNewStatusColor(e.target.value)}
                className="h-10 w-16 cursor-pointer"
              />
              <Button type="submit" size="sm" disabled={isStatusPending}>
                Add
              </Button>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

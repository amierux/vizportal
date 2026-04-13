"use client";

import { useState } from "react";
import { createInvitation, resendInvitation } from "@/lib/actions/invitations";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Plus, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { formatDate } from "@/lib/utils/format";
import type { Department, JobLevel, Role, Invitation } from "@/types";

type InvitationFormProps = {
  invitations: Invitation[];
  departments: Pick<Department, "id" | "name">[];
  jobLevels: Pick<JobLevel, "id" | "code" | "name">[];
  roles: Pick<Role, "id" | "name">[];
};

export function InvitationForm({ invitations, departments, jobLevels, roles }: InvitationFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoles, setSelectedRoles] = useState<string[]>([]);

  async function handleSubmit(formData: FormData) {
    formData.set("role_ids", selectedRoles.join(","));
    const result = await createInvitation(formData);
    if (result.error) toast.error(result.error);
    else {
      toast.success("Invitation sent");
      setIsOpen(false);
      setSelectedRoles([]);
    }
  }

  async function handleResend(id: string) {
    const result = await resendInvitation(id);
    if (result.error) toast.error(result.error);
    else toast.success("Invitation resent");
  }

  function toggleRole(roleId: string) {
    setSelectedRoles((prev) =>
      prev.includes(roleId) ? prev.filter((r) => r !== roleId) : [...prev, roleId]
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">Invitations</h3>
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
          <DialogTrigger
            className={cn(buttonVariants({ size: "sm" }))}
            onClick={() => setIsOpen(true)}
          >
            <Plus className="mr-2 h-4 w-4" /> Invite Employee
          </DialogTrigger>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Invite New Employee</DialogTitle>
            </DialogHeader>
            <form action={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input name="email" type="email" placeholder="employee@email.com" required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Department</Label>
                  <Select name="department_id">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.id}>
                          {d.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Job Level</Label>
                  <Select name="job_level_id">
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {jobLevels.map((jl) => (
                        <SelectItem key={jl.id} value={jl.id}>
                          {jl.code} — {jl.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label>Position</Label>
                <Input name="job_position" placeholder="e.g. Software Developer" />
              </div>
              <div className="space-y-2">
                <Label>Roles</Label>
                <div className="flex flex-wrap gap-2">
                  {roles.map((role) => (
                    <Badge
                      key={role.id}
                      variant={selectedRoles.includes(role.id) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => toggleRole(role.id)}
                    >
                      {role.name}
                    </Badge>
                  ))}
                </div>
                {selectedRoles.length === 0 && (
                  <p className="text-xs text-destructive">Select at least one role</p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={selectedRoles.length === 0}>
                Send Invitation
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Email</TableHead>
              <TableHead>Position</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sent</TableHead>
              <TableHead className="w-20">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {invitations.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No invitations
                </TableCell>
              </TableRow>
            )}
            {invitations.map((inv) => (
              <TableRow key={inv.id}>
                <TableCell>{inv.email}</TableCell>
                <TableCell>{inv.job_position ?? "—"}</TableCell>
                <TableCell>
                  <Badge
                    variant={
                      inv.status === "accepted"
                        ? "default"
                        : inv.status === "expired"
                          ? "destructive"
                          : "secondary"
                    }
                  >
                    {inv.status}
                  </Badge>
                </TableCell>
                <TableCell>{formatDate(inv.created_at)}</TableCell>
                <TableCell>
                  {(inv.status === "pending" || inv.status === "expired") && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleResend(inv.id)}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

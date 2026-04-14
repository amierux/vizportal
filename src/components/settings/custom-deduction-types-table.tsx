"use client";

import { useActionState, useEffect, useState } from "react";
import { createCustomDeductionType, toggleCustomDeductionType } from "@/lib/actions/payroll-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Tag } from "lucide-react";
import { toast } from "sonner";
import type { CustomDeductionType } from "@/types";

type CustomDeductionTypesTableProps = {
  types: CustomDeductionType[];
};

export function CustomDeductionTypesTable({ types }: CustomDeductionTypesTableProps) {
  const [state, formAction, isPending] = useActionState(createCustomDeductionType, null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (state && "success" in state) {
      toast.success("Deduction type created");
      setIsOpen(false);
    }
    if (state && "error" in state) toast.error(state.error as string);
  }, [state]);

  async function handleToggle(id: string, isActive: boolean) {
    const result = await toggleCustomDeductionType(id, isActive);
    if (result.error) toast.error(result.error);
    else toast.success(isActive ? "Activated" : "Deactivated");
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Tag className="h-5 w-5" />
            <div>
              <CardTitle className="text-base">Custom Deduction Types</CardTitle>
              <CardDescription className="mt-1">
                Define company-specific deduction categories used in recurring deductions and payroll entries.
              </CardDescription>
            </div>
          </div>
          <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="mr-2 h-4 w-4" /> Add Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>New Deduction Type</DialogTitle>
              </DialogHeader>
              <form action={formAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new-deduction-name">Name</Label>
                  <Input
                    id="new-deduction-name"
                    name="name"
                    placeholder="e.g. Cash Advance, Uniform Loan"
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? "Creating..." : "Create"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24 text-right">Active</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.length === 0 && (
                <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No deduction types defined
                  </TableCell>
                </TableRow>
              )}
              {types.map((type) => (
                <TableRow key={type.id} className="row-hover">
                  <TableCell className="font-medium">{type.name}</TableCell>
                  <TableCell>
                    <Badge variant={type.is_active ? "default" : "secondary"}>
                      {type.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Switch
                      checked={type.is_active}
                      onCheckedChange={(checked) => handleToggle(type.id, checked)}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

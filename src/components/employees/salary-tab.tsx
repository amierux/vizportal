"use client";

import { useActionState, useEffect, useState } from "react";
import {
  saveEmployeeSalaryDetails,
  addRecurringDeduction,
  toggleRecurringDeduction,
} from "@/lib/actions/payroll-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Plus, Banknote, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

type RecurringDeduction = {
  id: string;
  custom_deduction_type_id: string;
  amount: number;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  custom_deduction_types?: { name: string } | null;
};

type DeductionType = {
  id: string;
  name: string;
  is_active: boolean;
};

type SalaryTabProps = {
  profileId: string;
  salary: number | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  sssNumber: string | null;
  philhealthNumber: string | null;
  pagibigNumber: string | null;
  recurringDeductions: RecurringDeduction[];
  deductionTypes: DeductionType[];
};

export function SalaryTab({
  profileId,
  salary,
  bankName,
  bankAccountNumber,
  sssNumber,
  philhealthNumber,
  pagibigNumber,
  recurringDeductions,
  deductionTypes,
}: SalaryTabProps) {
  const [saveState, saveAction, isSaving] = useActionState(saveEmployeeSalaryDetails, null);
  const [addState, addAction, isAdding] = useActionState(addRecurringDeduction, null);
  const [isAddOpen, setIsAddOpen] = useState(false);

  // Local salary for derived rate calculation
  const [salaryInput, setSalaryInput] = useState(String(salary ?? ""));
  const salaryNum = parseFloat(salaryInput) || 0;
  const dailyRate = salaryNum > 0 ? salaryNum / 22 : 0;
  const hourlyRate = dailyRate > 0 ? dailyRate / 8 : 0;

  useEffect(() => {
    if (saveState && "success" in saveState) toast.success("Salary details saved");
    if (saveState && "error" in saveState) toast.error(saveState.error as string);
  }, [saveState]);

  useEffect(() => {
    if (addState && "success" in addState) {
      toast.success("Recurring deduction added");
      setIsAddOpen(false);
    }
    if (addState && "error" in addState) toast.error(addState.error as string);
  }, [addState]);

  async function handleToggleDeduction(id: string, isActive: boolean) {
    const result = await toggleRecurringDeduction(id, isActive);
    if (result.error) toast.error(result.error);
    else toast.success(isActive ? "Activated" : "Deactivated");
  }

  const activeDeductionTypes = deductionTypes.filter((dt) => dt.is_active);

  return (
    <div className="space-y-6">
      {/* Salary & Bank Details Form */}
      <form action={saveAction} className="space-y-6">
        <input type="hidden" name="_profileId" value={profileId} />

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Banknote className="h-5 w-5" />
              <CardTitle className="text-base">Compensation</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary">Basic Monthly Salary (₱)</Label>
                <Input
                  id="salary"
                  name="salary"
                  type="number"
                  step="0.01"
                  min="0"
                  value={salaryInput}
                  onChange={(e) => setSalaryInput(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label>Daily Rate</Label>
                <Input
                  readOnly
                  value={dailyRate > 0 ? dailyRate.toFixed(2) : "—"}
                  className="bg-muted/50 cursor-default"
                  tabIndex={-1}
                />
                <p className="text-xs text-muted-foreground">Salary ÷ 22 working days</p>
              </div>
              <div className="space-y-2">
                <Label>Hourly Rate</Label>
                <Input
                  readOnly
                  value={hourlyRate > 0 ? hourlyRate.toFixed(2) : "—"}
                  className="bg-muted/50 cursor-default"
                  tabIndex={-1}
                />
                <p className="text-xs text-muted-foreground">Daily rate ÷ 8 hours</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Bank Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="bank_name">Bank Name</Label>
                <Input
                  id="bank_name"
                  name="bank_name"
                  defaultValue={bankName ?? ""}
                  placeholder="e.g. BDO, BPI, Metrobank"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bank_account_number">Account Number</Label>
                <Input
                  id="bank_account_number"
                  name="bank_account_number"
                  defaultValue={bankAccountNumber ?? ""}
                  placeholder="0000-0000-0000"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving..." : "Save Salary & Bank Details"}
        </Button>
      </form>

      {/* Government ID References */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5" />
            <CardTitle className="text-base">Government ID Numbers</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>SSS Number</Label>
              <Input
                readOnly
                value={sssNumber ?? "—"}
                className="bg-muted/50 cursor-default font-mono"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label>PhilHealth Number</Label>
              <Input
                readOnly
                value={philhealthNumber ?? "—"}
                className="bg-muted/50 cursor-default font-mono"
                tabIndex={-1}
              />
            </div>
            <div className="space-y-2">
              <Label>Pag-IBIG Number</Label>
              <Input
                readOnly
                value={pagibigNumber ?? "—"}
                className="bg-muted/50 cursor-default font-mono"
                tabIndex={-1}
              />
            </div>
          </div>
          <p className="mt-3 text-xs text-muted-foreground">
            Government IDs are managed in the Employment tab.
          </p>
        </CardContent>
      </Card>

      {/* Recurring Deductions */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Recurring Deductions</CardTitle>
            <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
              <DialogTrigger asChild>
                <Button size="sm" disabled={activeDeductionTypes.length === 0}>
                  <Plus className="mr-2 h-4 w-4" /> Add Deduction
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add Recurring Deduction</DialogTitle>
                </DialogHeader>
                <form action={addAction} className="space-y-4">
                  <input type="hidden" name="_profileId" value={profileId} />
                  <div className="space-y-2">
                    <Label>Deduction Type</Label>
                    <Select name="deduction_type_id" required>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type..." />
                      </SelectTrigger>
                      <SelectContent>
                        {activeDeductionTypes.map((dt) => (
                          <SelectItem key={dt.id} value={dt.id}>
                            {dt.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="deduction-amount">Amount (₱)</Label>
                    <Input
                      id="deduction-amount"
                      name="amount"
                      type="number"
                      step="0.01"
                      min="0.01"
                      placeholder="0.00"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="deduction-start">Start Date</Label>
                      <Input
                        id="deduction-start"
                        name="start_date"
                        type="date"
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="deduction-end">End Date</Label>
                      <Input
                        id="deduction-end"
                        name="end_date"
                        type="date"
                      />
                    </div>
                  </div>
                  <Button type="submit" className="w-full" disabled={isAdding}>
                    {isAdding ? "Adding..." : "Add Deduction"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {activeDeductionTypes.length === 0 && (
            <p className="text-sm text-muted-foreground mb-4">
              No active deduction types configured. Add types in Payroll Settings first.
            </p>
          )}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Type</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Start Date</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-20 text-right">Active</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recurringDeductions.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground">
                      No recurring deductions
                    </TableCell>
                  </TableRow>
                )}
                {recurringDeductions.map((rd) => (
                  <TableRow key={rd.id} className="row-hover">
                    <TableCell className="font-medium">
                      {rd.custom_deduction_types?.name ?? "—"}
                    </TableCell>
                    <TableCell>₱{rd.amount.toFixed(2)}</TableCell>
                    <TableCell>{rd.start_date}</TableCell>
                    <TableCell>{rd.end_date ?? "Ongoing"}</TableCell>
                    <TableCell>
                      <Badge variant={rd.is_active ? "default" : "secondary"}>
                        {rd.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Switch
                        checked={rd.is_active}
                        onCheckedChange={(checked) => handleToggleDeduction(rd.id, checked)}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

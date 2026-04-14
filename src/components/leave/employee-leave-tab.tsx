"use client";

import { useState } from "react";
import {
  allocateLeaveBalance,
  allocateAllLeaveBalances,
} from "@/lib/actions/leave";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil } from "lucide-react";
import { BalanceAdjustmentDialog } from "@/components/leave/balance-adjustment-dialog";
import type { LeaveType, LeaveBalance } from "@/types";

type BalanceRow = {
  leaveType: LeaveType;
  balance: LeaveBalance | null;
};

type EmployeeLeaveTabProps = {
  profileId: string;
  balances: BalanceRow[];
};

export function EmployeeLeaveTab({ profileId, balances }: EmployeeLeaveTabProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [adjustBalance, setAdjustBalance] = useState<{
    id: string;
    total_days: number;
    used_days: number;
    remaining_days: number;
    employeeName: string;
    leaveTypeName: string;
  } | null>(null);

  const hasUnallocated = balances.some((b) => !b.balance);

  async function handleAllocate(leaveTypeId: string) {
    setLoading(leaveTypeId);
    const result = await allocateLeaveBalance(profileId, leaveTypeId);
    if ("error" in result) toast.error(result.error);
    else toast.success("Balance allocated");
    setLoading(null);
  }

  async function handleAllocateAll() {
    setBulkLoading(true);
    const result = await allocateAllLeaveBalances(profileId);
    if ("error" in result) toast.error(result.error as string);
    else toast.success(`${result.allocated} balance(s) allocated`);
    setBulkLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">
            Leave Balances ({new Date().getFullYear()})
          </CardTitle>
          {hasUnallocated && (
            <Button
              size="sm"
              onClick={handleAllocateAll}
              disabled={bulkLoading}
            >
              <Plus className="mr-2 h-4 w-4" />
              {bulkLoading ? "Allocating..." : "Allocate All"}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Leave Type</TableHead>
              <TableHead>Code</TableHead>
              <TableHead className="text-right">Total</TableHead>
              <TableHead className="text-right">Used</TableHead>
              <TableHead className="text-right">Remaining</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {balances.map((row) => (
              <TableRow key={row.leaveType.id}>
                <TableCell>{row.leaveType.name}</TableCell>
                <TableCell>
                  <Badge variant="outline">{row.leaveType.code}</Badge>
                </TableCell>
                {row.balance ? (
                  <>
                    <TableCell className="text-right">
                      {row.balance.total_days}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.balance.used_days}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {row.balance.remaining_days}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setAdjustBalance({
                            id: row.balance!.id,
                            total_days: row.balance!.total_days,
                            used_days: row.balance!.used_days,
                            remaining_days: row.balance!.remaining_days,
                            employeeName: "",
                            leaveTypeName: row.leaveType.name,
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </>
                ) : (
                  <>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      Not allocated
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAllocate(row.leaveType.id)}
                        disabled={loading === row.leaveType.id}
                      >
                        {loading === row.leaveType.id ? "..." : "Allocate"}
                      </Button>
                    </TableCell>
                  </>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>

      <BalanceAdjustmentDialog
        open={!!adjustBalance}
        onOpenChange={(open) => !open && setAdjustBalance(null)}
        balance={adjustBalance}
      />
    </Card>
  );
}

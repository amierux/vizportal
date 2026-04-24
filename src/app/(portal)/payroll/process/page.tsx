"use client";

import { useActionState, useEffect } from "react";
import { createPayrollPeriod, getLatestDraftPeriod, getPayrollEntries } from "@/lib/actions/payroll";
import { EmployeeReadinessTable } from "@/components/payroll/employee-readiness-table";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";
import { CalendarDays, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect as useLayoutEffect } from "react";
import { formatDate } from "@/lib/utils/format";
import { cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type DraftState = { period: any | null; entries: any[] } | null;

export default function ProcessPayrollPage() {
  const router = useRouter();
  const [draftState, setDraftState] = useState<DraftState>(null);
  const [loading, setLoading] = useState(true);
  const [createState, createAction, isPending] = useActionState(
    createPayrollPeriod,
    null
  );

  // Load draft period on mount
  useLayoutEffect(() => {
    async function load() {
      setLoading(true);
      const period = await getLatestDraftPeriod();
      if (period) {
        const entries = await getPayrollEntries(period.id);
        setDraftState({ period, entries });
      } else {
        setDraftState({ period: null, entries: [] });
      }
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (createState && "success" in createState) {
      toast.success("Payroll period created and computation started");
      router.refresh();
      setTimeout(() => {
        window.location.reload();
      }, 300);
    }
    if (createState && "error" in createState) {
      toast.error(createState.error);
    }
  }, [createState, router]);

  const backLink = (
    <Link
      href="/payroll"
      className={cn(buttonVariants({ variant: "ghost", size: "sm" }))}
    >
      <ArrowLeft className="mr-2 h-4 w-4" />
      Back
    </Link>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          {backLink}
          <h1 className="text-2xl font-bold">Process Payroll</h1>
        </div>
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  const hasDraft = !!draftState?.period;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        {backLink}
        <div>
          <h1 className="text-2xl font-bold">Process Payroll</h1>
          <p className="text-muted-foreground text-sm">
            {hasDraft
              ? `Processing period: ${formatDate(draftState?.period.start_date)} – ${formatDate(draftState?.period.end_date)}`
              : "Create a new payroll period to begin"}
          </p>
        </div>
      </div>

      <Separator />

      {hasDraft ? (
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">Employee Readiness</h2>
          <EmployeeReadinessTable
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            entries={draftState?.entries as any[] ?? []}
            periodId={draftState?.period.id ?? ""}
          />
        </div>
      ) : (
        <div className="max-w-lg">
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <CalendarDays className="h-5 w-5 text-muted-foreground" />
                <CardTitle>Create Payroll Period</CardTitle>
              </div>
              <CardDescription>
                Set the pay period dates and pay date. Payroll will be
                automatically computed for all active employees.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form action={createAction} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="start_date">Period Start Date</Label>
                  <Input id="start_date" name="start_date" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="end_date">Period End Date</Label>
                  <Input id="end_date" name="end_date" type="date" required />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="pay_date">Pay Date</Label>
                  <Input id="pay_date" name="pay_date" type="date" required />
                </div>
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending
                    ? "Creating & Computing..."
                    : "Create Period & Compute Payroll"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

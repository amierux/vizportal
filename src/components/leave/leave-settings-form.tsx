"use client";

import { useActionState, useEffect } from "react";
import { updateLeaveSettings } from "@/lib/actions/leave-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import type { LeaveSettings } from "@/types";

type LeaveSettingsFormProps = {
  settings: LeaveSettings | null;
};

export function LeaveSettingsForm({ settings }: LeaveSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateLeaveSettings, null);

  useEffect(() => {
    if (state && "success" in state) toast.success("Leave settings updated");
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Annual Leave Reset Date</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Reset Month</Label>
              <Input
                name="reset_month"
                type="number"
                min={1}
                max={12}
                defaultValue={settings?.reset_month ?? 1}
              />
            </div>
            <div className="space-y-2">
              <Label>Reset Day</Label>
              <Input
                name="reset_day"
                type="number"
                min={1}
                max={31}
                defaultValue={settings?.reset_day ?? 1}
              />
            </div>
          </div>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Saving..." : "Save Settings"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useActionState, useEffect } from "react";
import { saveEmployeeSchedule } from "@/lib/actions/attendance";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { WORK_TYPES, WORK_DAYS } from "@/lib/constants";
import type { EmployeeSchedule } from "@/types";

type ScheduleFormProps = {
  profileId: string;
  schedule: EmployeeSchedule | null;
  readOnly?: boolean;
};

export function ScheduleForm({ profileId, schedule, readOnly }: ScheduleFormProps) {
  const [state, formAction, isPending] = useActionState(saveEmployeeSchedule, null);

  useEffect(() => {
    if (state && "success" in state) toast.success("Schedule saved");
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Work Schedule</CardTitle>
      </CardHeader>
      <CardContent>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="_profileId" value={profileId} />

          <div className="space-y-2">
            <Label>Work Type</Label>
            <Select
              name="work_type"
              defaultValue={schedule?.work_type ?? "full_time"}
              disabled={readOnly}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {WORK_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Input
                name="start_time"
                type="time"
                defaultValue={schedule?.start_time ?? "08:00"}
                disabled={readOnly}
              />
            </div>
            <div className="space-y-2">
              <Label>End Time</Label>
              <Input
                name="end_time"
                type="time"
                defaultValue={schedule?.end_time ?? "17:00"}
                disabled={readOnly}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Work Days</Label>
            <div className="flex flex-wrap gap-2">
              {WORK_DAYS.map((day) => {
                const isChecked = schedule?.work_days?.includes(day.value) ??
                  ["mon", "tue", "wed", "thu", "fri"].includes(day.value);
                return (
                  <label key={day.value} className="flex items-center gap-1.5 text-sm">
                    <input
                      type="checkbox"
                      name="work_days"
                      value={day.value}
                      defaultChecked={isChecked}
                      disabled={readOnly}
                      className="rounded border-gray-300"
                    />
                    {day.label}
                  </label>
                );
              })}
            </div>
          </div>

          {!readOnly && (
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : "Save Schedule"}
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

"use client";

import { useActionState, useEffect } from "react";
import { updateEmployee } from "@/lib/actions/employees";
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
import { toast } from "sonner";
import { EMPLOYMENT_STATUSES, SALARY_FREQUENCIES } from "@/lib/constants";
import type { Department, JobLevel } from "@/types";

type EmploymentTabProps = {
  profileId: string;
  data: {
    department_id: string | null;
    job_level_id: string | null;
    job_position: string | null;
    weekly_required_hours: number;
    salary: number | null;
    salary_frequency: string | null;
    date_hired: string | null;
    date_regularized: string | null;
    employment_status: string;
    tin_number: string | null;
    sss_number: string | null;
    philhealth_number: string | null;
    pagibig_number: string | null;
  };
  firstName: string | null;
  lastName: string | null;
  departments: Pick<Department, "id" | "name">[];
  jobLevels: Pick<JobLevel, "id" | "code" | "name">[];
  canEdit: boolean;
};

export function EmploymentTab({
  profileId,
  data,
  firstName,
  lastName,
  departments,
  jobLevels,
  canEdit,
}: EmploymentTabProps) {
  const [state, formAction, isPending] = useActionState(updateEmployee, null);

  useEffect(() => {
    if (state?.success) toast.success("Employment info updated");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="_profileId" value={profileId} />
      <input type="hidden" name="first_name" value={firstName ?? ""} />
      <input type="hidden" name="last_name" value={lastName ?? ""} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Department</Label>
          {canEdit ? (
            <Select name="department_id" defaultValue={data.department_id ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {departments.map((d) => (
                  <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={departments.find((d) => d.id === data.department_id)?.name ?? "—"} readOnly className="bg-muted" />
          )}
        </div>
        <div className="space-y-2">
          <Label>Job Level</Label>
          {canEdit ? (
            <Select name="job_level_id" defaultValue={data.job_level_id ?? ""}>
              <SelectTrigger>
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
          ) : (
            <Input value={jobLevels.find((jl) => jl.id === data.job_level_id)?.code ?? "—"} readOnly className="bg-muted" />
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label>Position</Label>
        <Input name={canEdit ? "job_position" : undefined} defaultValue={data.job_position ?? ""} readOnly={!canEdit} className={!canEdit ? "bg-muted" : ""} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>Weekly Hours</Label>
          <Input name={canEdit ? "weekly_required_hours" : undefined} type="number" step="0.5" defaultValue={data.weekly_required_hours} readOnly={!canEdit} className={!canEdit ? "bg-muted" : ""} />
        </div>
        <div className="space-y-2">
          <Label>Salary</Label>
          <Input name={canEdit ? "salary" : undefined} type="number" step="0.01" defaultValue={data.salary ?? ""} readOnly={!canEdit} className={!canEdit ? "bg-muted" : ""} />
        </div>
        <div className="space-y-2">
          <Label>Frequency</Label>
          {canEdit ? (
            <Select name="salary_frequency" defaultValue={data.salary_frequency ?? ""}>
              <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
              <SelectContent>
                {SALARY_FREQUENCIES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={SALARY_FREQUENCIES.find((s) => s.value === data.salary_frequency)?.label ?? "—"} readOnly className="bg-muted" />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Date Hired</Label>
          <Input name={canEdit ? "date_hired" : undefined} type="date" defaultValue={data.date_hired ?? ""} readOnly={!canEdit} className={!canEdit ? "bg-muted" : ""} />
        </div>
        <div className="space-y-2">
          <Label>Date Regularized</Label>
          <Input name={canEdit ? "date_regularized" : undefined} type="date" defaultValue={data.date_regularized ?? ""} readOnly={!canEdit} className={!canEdit ? "bg-muted" : ""} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Employment Status</Label>
        {canEdit ? (
          <Select name="employment_status" defaultValue={data.employment_status}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {EMPLOYMENT_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <Input value={data.employment_status} readOnly className="bg-muted" />
        )}
      </div>

      <div className="border-t pt-4">
        <h3 className="mb-4 text-lg font-medium">Government IDs</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[
            { name: "tin_number", label: "TIN" },
            { name: "sss_number", label: "SSS" },
            { name: "philhealth_number", label: "PhilHealth" },
            { name: "pagibig_number", label: "Pag-IBIG" },
          ].map((field) => (
            <div key={field.name} className="space-y-2">
              <Label>{field.label}</Label>
              <Input
                name={canEdit ? field.name : undefined}
                defaultValue={(data as any)[field.name] ?? ""}
                readOnly={!canEdit}
                className={!canEdit ? "bg-muted" : ""}
              />
            </div>
          ))}
        </div>
      </div>

      {canEdit && (
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      )}
    </form>
  );
}

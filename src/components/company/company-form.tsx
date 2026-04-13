"use client";

import { useActionState, useEffect } from "react";
import { updateCompany } from "@/lib/actions/company";
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
import type { Company, Profile } from "@/types";
import { formatFullName } from "@/lib/utils/format";

type CompanyFormProps = {
  company: Company;
  members: Pick<Profile, "id" | "first_name" | "last_name">[];
};

export function CompanyForm({ company, members }: CompanyFormProps) {
  const [state, formAction, isPending] = useActionState(updateCompany, null);

  useEffect(() => {
    if (state?.success) toast.success("Company info updated");
    if (state?.error) toast.error(state.error);
  }, [state]);

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Company Name</Label>
        <Input id="name" name="name" defaultValue={company.name} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="business_manager_id">Business Manager</Label>
        <Select name="business_manager_id" defaultValue={company.business_manager_id ?? ""}>
          <SelectTrigger>
            <SelectValue placeholder="Select Business Manager" />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {formatFullName(m.first_name, m.last_name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="director_id">Director</Label>
        <Select name="director_id" defaultValue={company.director_id ?? ""}>
          <SelectTrigger>
            <SelectValue placeholder="Select Director" />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {formatFullName(m.first_name, m.last_name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}

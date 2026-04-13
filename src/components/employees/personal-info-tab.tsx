"use client";

import { useActionState, useEffect } from "react";
import { updateEmployee, updateOwnProfile } from "@/lib/actions/employees";
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
import { GENDERS } from "@/lib/constants";

type PersonalInfoTabProps = {
  profileId: string;
  data: {
    first_name: string | null;
    last_name: string | null;
    email: string;
    phone_number: string | null;
    gender: string | null;
    date_of_birth: string | null;
    address_line: string | null;
    city: string | null;
    province: string | null;
    zip_code: string | null;
    country: string | null;
    emergency_contact_name: string | null;
    emergency_contact_phone: string | null;
    emergency_contact_relationship: string | null;
  };
  canEditAll: boolean;
  isSelf: boolean;
};

export function PersonalInfoTab({
  profileId,
  data,
  canEditAll,
  isSelf,
}: PersonalInfoTabProps) {
  const action = isSelf && !canEditAll ? updateOwnProfile : updateEmployee;

  const [state, formAction, isPending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) toast.success("Personal info updated");
    if (state?.error) toast.error(state.error);
  }, [state]);

  const canEditPersonal = canEditAll || isSelf;
  const readOnly = !canEditPersonal;

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="_profileId" value={profileId} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>First Name</Label>
          <Input
            name="first_name"
            defaultValue={data.first_name ?? ""}
            readOnly={!canEditAll}
            className={!canEditAll ? "bg-muted" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label>Last Name</Label>
          <Input
            name="last_name"
            defaultValue={data.last_name ?? ""}
            readOnly={!canEditAll}
            className={!canEditAll ? "bg-muted" : ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Email</Label>
        <Input value={data.email} readOnly className="bg-muted" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label>Gender</Label>
          {canEditAll ? (
            <Select name="gender" defaultValue={data.gender ?? ""}>
              <SelectTrigger>
                <SelectValue placeholder="Select" />
              </SelectTrigger>
              <SelectContent>
                {GENDERS.map((g) => (
                  <SelectItem key={g.value} value={g.value}>
                    {g.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <Input value={data.gender ?? "—"} readOnly className="bg-muted" />
          )}
        </div>
        <div className="space-y-2">
          <Label>Date of Birth</Label>
          <Input
            name={canEditAll ? "date_of_birth" : undefined}
            type="date"
            defaultValue={data.date_of_birth ?? ""}
            readOnly={!canEditAll}
            className={!canEditAll ? "bg-muted" : ""}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Phone Number</Label>
        <Input
          name="phone_number"
          defaultValue={data.phone_number ?? ""}
          readOnly={readOnly}
          className={readOnly ? "bg-muted" : ""}
        />
      </div>

      <div className="space-y-2">
        <Label>Address</Label>
        <Input
          name="address_line"
          defaultValue={data.address_line ?? ""}
          readOnly={readOnly}
          className={readOnly ? "bg-muted" : ""}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label>City</Label>
          <Input
            name="city"
            defaultValue={data.city ?? ""}
            readOnly={readOnly}
            className={readOnly ? "bg-muted" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label>Province</Label>
          <Input
            name="province"
            defaultValue={data.province ?? ""}
            readOnly={readOnly}
            className={readOnly ? "bg-muted" : ""}
          />
        </div>
        <div className="space-y-2">
          <Label>ZIP Code</Label>
          <Input
            name="zip_code"
            defaultValue={data.zip_code ?? ""}
            readOnly={readOnly}
            className={readOnly ? "bg-muted" : ""}
          />
        </div>
      </div>

      <div className="border-t pt-4">
        <h3 className="mb-4 text-lg font-medium">Emergency Contact</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Contact Name</Label>
            <Input
              name="emergency_contact_name"
              defaultValue={data.emergency_contact_name ?? ""}
              readOnly={readOnly}
              className={readOnly ? "bg-muted" : ""}
            />
          </div>
          <div className="space-y-2">
            <Label>Contact Phone</Label>
            <Input
              name="emergency_contact_phone"
              defaultValue={data.emergency_contact_phone ?? ""}
              readOnly={readOnly}
              className={readOnly ? "bg-muted" : ""}
            />
          </div>
        </div>
        <div className="mt-4 space-y-2">
          <Label>Relationship</Label>
          <Input
            name="emergency_contact_relationship"
            defaultValue={data.emergency_contact_relationship ?? ""}
            readOnly={readOnly}
            className={readOnly ? "bg-muted" : ""}
          />
        </div>
      </div>

      {canEditPersonal && (
        <Button type="submit" disabled={isPending}>
          {isPending ? "Saving..." : "Save Changes"}
        </Button>
      )}
    </form>
  );
}

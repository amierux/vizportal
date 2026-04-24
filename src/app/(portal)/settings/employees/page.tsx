import { getLeaveTypes } from "@/lib/actions/leave-types";
import { getLeaveSettings } from "@/lib/actions/leave-settings";
import { LeaveTypeTable } from "@/components/leave/leave-type-table";
import { LeaveSettingsForm } from "@/components/leave/leave-settings-form";

export default async function EmployeeSettingsPage() {
  const [leaveTypes, settings] = await Promise.all([
    getLeaveTypes(),
    getLeaveSettings(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Employee Settings</h1>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Leave Types</h2>
        <p className="mb-4 text-sm text-muted-foreground">
          Manage leave types available to employees. PH statutory types are pre-configured.
        </p>
        <LeaveTypeTable leaveTypes={leaveTypes} />
      </div>

      <div>
        <h2 className="mb-3 text-lg font-semibold">Leave Reset Configuration</h2>
        <LeaveSettingsForm settings={settings} />
      </div>
    </div>
  );
}

import { getLeaveTypes } from "@/lib/actions/leave-types";
import { getLeaveSettings } from "@/lib/actions/leave-settings";
import { LeaveTypeTable } from "@/components/leave/leave-type-table";
import { LeaveSettingsForm } from "@/components/leave/leave-settings-form";

export default async function LeaveSettingsPage() {
  const [leaveTypes, settings] = await Promise.all([
    getLeaveTypes(),
    getLeaveSettings(),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Leave Settings</h1>

      <LeaveSettingsForm settings={settings} />

      <div>
        <h2 className="mb-3 text-lg font-semibold">Leave Types</h2>
        <LeaveTypeTable leaveTypes={leaveTypes} />
      </div>
    </div>
  );
}

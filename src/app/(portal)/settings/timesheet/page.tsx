import { getTimesheetSettings, getTimesheetApprovalConfig } from "@/lib/actions/timesheet-settings";
import { TimesheetSettingsForm } from "@/components/settings/timesheet-settings-form";

export default async function TimesheetSettingsPage() {
  const [settings, approvalConfig] = await Promise.all([
    getTimesheetSettings(),
    getTimesheetApprovalConfig(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-bold">Timesheet Settings</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <TimesheetSettingsForm settings={settings as any} approvalConfig={approvalConfig as any} />
    </div>
  );
}

import { getSystemSettings } from "@/lib/actions/system-settings";
import { ApprovalSettingsForm } from "@/components/settings/approval-settings-form";

export default async function ApprovalSettingsPage() {
  const settings = await getSystemSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Approval Settings</h1>
      <ApprovalSettingsForm settings={settings} />
    </div>
  );
}

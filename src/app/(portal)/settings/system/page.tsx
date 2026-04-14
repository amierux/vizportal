import { getSystemSettings } from "@/lib/actions/system-settings";
import { SystemConfigForm } from "@/components/settings/system-config-form";

export default async function SystemSettingsPage() {
  const settings = await getSystemSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-bold">System Configuration</h1>
      <SystemConfigForm settings={settings} />
    </div>
  );
}

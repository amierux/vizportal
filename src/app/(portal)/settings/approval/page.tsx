import { getSystemSettings } from "@/lib/actions/system-settings";
import { getApprovalConfigs } from "@/lib/actions/approval-configs";
import { ApprovalSettingsForm } from "@/components/settings/approval-settings-form";
import { ApprovalChainEditor } from "@/components/settings/approval-chain-editor";
import { Separator } from "@/components/ui/separator";

export default async function ApprovalSettingsPage() {
  const [settings, configs] = await Promise.all([
    getSystemSettings(),
    getApprovalConfigs(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Approval Settings</h1>
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ApprovalChainEditor configs={configs as any} />
      <Separator />
      <ApprovalSettingsForm settings={settings} />
    </div>
  );
}

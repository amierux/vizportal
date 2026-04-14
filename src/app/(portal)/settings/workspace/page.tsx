import { getChecklistTemplates, getListTemplates } from "@/lib/actions/workspace-templates";
import { WorkspaceTemplates } from "@/components/settings/workspace-templates";

export default async function WorkspaceSettingsPage() {
  const [checklistTemplates, listTemplates] = await Promise.all([
    getChecklistTemplates(),
    getListTemplates(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-6 animate-fade-in-up">
      <h1 className="text-2xl font-bold">Workspace Settings</h1>
      <WorkspaceTemplates
        checklistTemplates={checklistTemplates}
        listTemplates={listTemplates}
      />
    </div>
  );
}

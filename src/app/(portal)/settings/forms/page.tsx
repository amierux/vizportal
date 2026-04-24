import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Info } from "lucide-react";

export default async function FormsSettingsPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Form Settings</h1>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Per-Form Configuration</CardTitle>
          </div>
          <CardDescription>
            Form-level settings are configured per-form in the form builder. Global form defaults
            will be added in a future update.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            To configure a form&apos;s approval chain, distribution schedule, save-to-list
            integration, or public link, open the form in the builder and go to the{" "}
            <strong>Settings</strong> tab.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

"use client";

import { useActionState, useEffect, useState } from "react";
import { updateSystemSettings } from "@/lib/actions/system-settings";
import { SETTING_KEYS } from "@/lib/constants/settings-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { toast } from "sonner";
import { Eye, EyeOff, Mail, Shield } from "lucide-react";
import type { SystemSetting } from "@/types";

type SystemConfigFormProps = {
  settings: SystemSetting[];
};

export function SystemConfigForm({ settings }: SystemConfigFormProps) {
  const [state, formAction, isPending] = useActionState(updateSystemSettings, null);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (state && "success" in state) toast.success("Settings saved");
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  function getValue(key: string): string {
    const setting = settings.find((s) => s.key === key);
    return setting?.value ?? "";
  }

  function toggleReveal(key: string) {
    setRevealed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  const emailSettings = SETTING_KEYS.filter(
    (s) => s.key === "resend_api_key" || s.key === "email_sender_address" || s.key === "email_sender_name"
  );
  const securitySettings = SETTING_KEYS.filter(
    (s) => s.key === "cron_secret" || s.key === "app_url"
  );

  function renderField(setting: (typeof SETTING_KEYS)[number]) {
    const currentValue = getValue(setting.key);
    const isRevealed = revealed[setting.key] ?? false;

    return (
      <div key={setting.key} className="space-y-2">
        <Label htmlFor={setting.key}>{setting.label}</Label>
        <div className="flex gap-2">
          <Input
            id={setting.key}
            name={setting.key}
            type={setting.isSecret && !isRevealed ? "password" : "text"}
            defaultValue={currentValue}
            placeholder={setting.isSecret ? (currentValue ? "••••••••" : "Not set") : "Not set"}
          />
          {setting.isSecret && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => toggleReveal(setting.key)}
            >
              {isRevealed ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
          )}
        </div>
        {setting.isSecret && (
          <p className="text-xs text-muted-foreground">
            Leave empty to keep the current value.
          </p>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle className="text-base">Email Configuration</CardTitle>
          </div>
          <CardDescription>
            Configure the email service used for approval notifications.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {emailSettings.map(renderField)}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            <CardTitle className="text-base">Security</CardTitle>
          </div>
          <CardDescription>
            Cron job authentication and application URL for email links.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {securitySettings.map(renderField)}
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Settings"}
      </Button>
    </form>
  );
}

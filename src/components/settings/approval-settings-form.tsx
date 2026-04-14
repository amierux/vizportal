"use client";

import { useActionState, useEffect, useState } from "react";
import { updateSystemSettings } from "@/lib/actions/system-settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Eye, EyeOff, Mail } from "lucide-react";
import type { SystemSetting } from "@/types";

type ApprovalSettingsFormProps = {
  settings: SystemSetting[];
};

export function ApprovalSettingsForm({ settings }: ApprovalSettingsFormProps) {
  const [state, formAction, isPending] = useActionState(updateSystemSettings, null);
  const [revealApiKey, setRevealApiKey] = useState(false);

  useEffect(() => {
    if (state && "success" in state) toast.success("Approval settings saved");
    if (state && "error" in state) toast.error(state.error);
  }, [state]);

  function getValue(key: string): string {
    const setting = settings.find((s) => s.key === key);
    return setting?.value ?? "";
  }

  const currentApiKey = getValue("resend_api_key");
  const currentSenderName = getValue("email_sender_name");
  const currentSenderAddress = getValue("email_sender_address");
  const currentAppUrl = getValue("app_url");

  return (
    <form action={formAction} className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            <CardTitle className="text-base">Email Provider</CardTitle>
          </div>
          <CardDescription>
            Select the email service used for sending approval notifications, reminders, and status updates.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Provider</Label>
            <Select defaultValue="resend" disabled>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resend">Resend</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Only Resend is currently supported. More providers coming soon.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Resend Configuration</CardTitle>
          <CardDescription>
            API credentials and sender details for Resend email delivery.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="resend_api_key">API Key</Label>
            <div className="flex gap-2">
              <Input
                id="resend_api_key"
                name="resend_api_key"
                type={revealApiKey ? "text" : "password"}
                defaultValue={currentApiKey}
                placeholder={currentApiKey ? "••••••••" : "re_xxxxx..."}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setRevealApiKey(!revealApiKey)}
              >
                {revealApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Get your API key from resend.com/api-keys. Leave empty to keep the current value.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_sender_name">Sender Display Name</Label>
            <Input
              id="email_sender_name"
              name="email_sender_name"
              defaultValue={currentSenderName}
              placeholder="VizPortal"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="email_sender_address">Sender Email Address</Label>
            <Input
              id="email_sender_address"
              name="email_sender_address"
              type="email"
              defaultValue={currentSenderAddress}
              placeholder="noreply@vizserve.com"
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Approval Links</CardTitle>
          <CardDescription>
            The base URL used in approval email links.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="app_url">Application URL</Label>
            <Input
              id="app_url"
              name="app_url"
              defaultValue={currentAppUrl}
              placeholder="https://vizportal.vercel.app"
            />
            <p className="text-xs text-muted-foreground">
              Approval emails will link to this URL. Ensure it matches your deployment domain.
            </p>
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Approval Settings"}
      </Button>
    </form>
  );
}

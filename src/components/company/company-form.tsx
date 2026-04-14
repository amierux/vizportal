"use client";

import { useState, useActionState, useEffect } from "react";
import { updateCompany, uploadCompanyLogo, uploadCompanyFavicon } from "@/lib/actions/company";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import type { Company, Profile } from "@/types";
import { formatFullName } from "@/lib/utils/format";

type CompanyFormProps = {
  company: Company;
  members: Pick<Profile, "id" | "first_name" | "last_name">[];
};

export function CompanyForm({ company, members }: CompanyFormProps) {
  const [state, formAction, isPending] = useActionState(updateCompany, null);
  const [logoUrl, setLogoUrl] = useState(company.logo_url);
  const [faviconUrl, setFaviconUrl] = useState(company.favicon_url);
  const [uploading, setUploading] = useState<string | null>(null);

  useEffect(() => {
    if (state?.success) toast.success("Company info updated");
    if (state?.error) toast.error(state.error);
  }, [state]);

  async function handleUpload(type: "logo" | "favicon", file: File) {
    setUploading(type);
    const formData = new FormData();
    formData.append("file", file);

    const result = type === "logo"
      ? await uploadCompanyLogo(formData)
      : await uploadCompanyFavicon(formData);

    if ("error" in result) {
      toast.error(result.error);
    } else {
      toast.success(`${type === "logo" ? "Logo" : "Favicon"} uploaded`);
      if (type === "logo") setLogoUrl(result.url ?? null);
      else setFaviconUrl(result.url ?? null);
    }
    setUploading(null);
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="grid grid-cols-2 gap-6">
        <div className="space-y-2">
          <Label>Company Logo</Label>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-md">
              <AvatarImage src={logoUrl ?? undefined} />
              <AvatarFallback className="rounded-md text-lg">
                {company.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload("logo", file);
                }}
              />
              <span className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                <Upload className="h-4 w-4" />
                {uploading === "logo" ? "Uploading..." : "Upload Logo"}
              </span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">Recommended: 200x200px, PNG or JPG</p>
        </div>

        <div className="space-y-2">
          <Label>Favicon</Label>
          <div className="flex items-center gap-4">
            <Avatar className="h-16 w-16 rounded-md">
              <AvatarImage src={faviconUrl ?? undefined} />
              <AvatarFallback className="rounded-md text-lg">
                {company.name.charAt(0)}
              </AvatarFallback>
            </Avatar>
            <label className="cursor-pointer">
              <input
                type="file"
                accept="image/*,.ico"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleUpload("favicon", file);
                }}
              />
              <span className="inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm hover:bg-accent">
                <Upload className="h-4 w-4" />
                {uploading === "favicon" ? "Uploading..." : "Upload Favicon"}
              </span>
            </label>
          </div>
          <p className="text-xs text-muted-foreground">Recommended: 32x32px, ICO or PNG</p>
        </div>
      </div>

      <input type="hidden" name="logo_url" value={logoUrl ?? ""} />
      <input type="hidden" name="favicon_url" value={faviconUrl ?? ""} />

      <div className="space-y-2">
        <Label htmlFor="name">Company Name</Label>
        <Input id="name" name="name" defaultValue={company.name} required />
      </div>

      <div className="space-y-2">
        <Label htmlFor="business_manager_id">Business Manager</Label>
        <Select name="business_manager_id" defaultValue={company.business_manager_id ?? ""}>
          <SelectTrigger>
            <SelectValue placeholder="Select Business Manager" />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {formatFullName(m.first_name, m.last_name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="director_id">Director</Label>
        <Select name="director_id" defaultValue={company.director_id ?? ""}>
          <SelectTrigger>
            <SelectValue placeholder="Select Director" />
          </SelectTrigger>
          <SelectContent>
            {members.map((m) => (
              <SelectItem key={m.id} value={m.id}>
                {formatFullName(m.first_name, m.last_name)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button type="submit" disabled={isPending}>
        {isPending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}

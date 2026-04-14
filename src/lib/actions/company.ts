"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { companySchema } from "@/lib/validations/company";

export async function getCompany() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile) return null;

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", profile.company_id)
    .single();

  return company;
}

export async function updateCompany(_prevState: unknown, formData: FormData) {
  const supabase = await createClient();

  const parsed = companySchema.safeParse({
    name: formData.get("name"),
    logo_url: formData.get("logo_url") || null,
    favicon_url: formData.get("favicon_url") || null,
    business_manager_id: formData.get("business_manager_id") || null,
    director_id: formData.get("director_id") || null,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  if (!profile) return { error: "Profile not found" };

  const { error } = await supabase
    .from("companies")
    .update(parsed.data)
    .eq("id", profile.company_id);

  if (error) return { error: "Failed to update company" };

  revalidatePath("/company");
  return { success: true };
}

export async function uploadCompanyLogo(formData: FormData) {
  const supabase = await createClient();

  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found" };

  const ext = file.name.split(".").pop();
  const path = `${profile.company_id}/logos/company-logo.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("vizportal-storage")
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: "Failed to upload logo" };

  const { data: urlData } = supabase.storage
    .from("vizportal-storage")
    .getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("companies")
    .update({ logo_url: urlData.publicUrl })
    .eq("id", profile.company_id);

  if (updateError) return { error: "Failed to save logo URL" };

  revalidatePath("/company");
  return { success: true, url: urlData.publicUrl };
}

export async function uploadCompanyFavicon(formData: FormData) {
  const supabase = await createClient();

  const file = formData.get("file") as File;
  if (!file) return { error: "No file provided" };

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: "Not authenticated" };

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();
  if (!profile) return { error: "Profile not found" };

  const ext = file.name.split(".").pop();
  const path = `${profile.company_id}/logos/company-favicon.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("vizportal-storage")
    .upload(path, file, { upsert: true });

  if (uploadError) return { error: "Failed to upload favicon" };

  const { data: urlData } = supabase.storage
    .from("vizportal-storage")
    .getPublicUrl(path);

  const { error: updateError } = await supabase
    .from("companies")
    .update({ favicon_url: urlData.publicUrl })
    .eq("id", profile.company_id);

  if (updateError) return { error: "Failed to save favicon URL" };

  revalidatePath("/company");
  return { success: true, url: urlData.publicUrl };
}

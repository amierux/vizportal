"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { MAX_FILE_SIZE_BYTES, ACCEPTED_FILE_TYPES } from "@/lib/constants";

export async function getDocuments(profileId: string) {
  const supabase = await createClient();

  const { data } = await supabase
    .from("employee_documents")
    .select("*")
    .eq("profile_id", profileId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function uploadDocument(formData: FormData) {
  const supabase = await createClient();

  const file = formData.get("file") as File;
  const profileId = formData.get("profile_id") as string;
  const documentType = formData.get("document_type") as string;

  if (!file || !profileId || !documentType) {
    return { error: "Missing required fields" };
  }

  if (file.size > MAX_FILE_SIZE_BYTES) {
    return { error: "File size exceeds 10MB limit" };
  }

  if (!ACCEPTED_FILE_TYPES.includes(file.type)) {
    return { error: "File type not accepted. Use PDF, JPG, PNG, or DOCX." };
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

  const docId = crypto.randomUUID();
  const ext = file.name.split(".").pop();
  const path = `${profile.company_id}/documents/${profileId}/${docId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("vizportal-storage")
    .upload(path, file);

  if (uploadError) return { error: "Failed to upload file" };

  const { data: urlData } = supabase.storage
    .from("vizportal-storage")
    .getPublicUrl(path);

  const { error: dbError } = await supabase.from("employee_documents").insert({
    profile_id: profileId,
    company_id: profile.company_id,
    document_type: documentType,
    file_name: file.name,
    file_url: urlData.publicUrl,
    uploaded_by: user.id,
  });

  if (dbError) return { error: "Failed to save document record" };

  revalidatePath(`/employees/${profileId}`);
  revalidatePath("/profile");
  return { success: true };
}

export async function deleteDocument(id: string, fileUrl: string) {
  const supabase = await createClient();

  // Extract storage path from URL
  const urlParts = fileUrl.split("/vizportal-storage/");
  if (urlParts.length > 1) {
    await supabase.storage
      .from("vizportal-storage")
      .remove([urlParts[1]]);
  }

  const { error } = await supabase
    .from("employee_documents")
    .delete()
    .eq("id", id);

  if (error) return { error: "Failed to delete document" };

  revalidatePath("/employees");
  revalidatePath("/profile");
  return { success: true };
}

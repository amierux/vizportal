import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getFormByPublicToken } from "@/lib/actions/forms";
import { FormRenderer } from "@/components/forms/form-renderer";
import Image from "next/image";

type Params = Promise<{ token: string }>;

export default async function PublicFormPage({ params }: { params: Params }) {
  const { token } = await params;

  const form = await getFormByPublicToken(token);

  // getFormByPublicToken already checks is_public + status = published
  if (!form) {
    // Distinguish between "not found" and "not published" would require a
    // separate query — for simplicity, not-found covers both cases since
    // the token itself is the access credential.
    notFound();
  }

  // Fetch company info for branding
  const supabase = await createClient();
  const { data: company } = await supabase
    .from("companies")
    .select("name, logo_url")
    .eq("id", form.company_id)
    .single();

  return (
    <div className="flex min-h-screen flex-col items-center bg-muted/30 p-4">
      {/* Company branding */}
      <div className="mt-8 mb-6 flex flex-col items-center gap-2">
        {company?.logo_url ? (
          <Image
            src={company.logo_url}
            alt={company.name ?? "Company logo"}
            width={120}
            height={40}
            className="object-contain"
          />
        ) : (
          <span className="text-lg font-semibold text-foreground">
            {company?.name ?? ""}
          </span>
        )}
      </div>

      {/* Form */}
      <div className="w-full max-w-2xl">
        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
        <FormRenderer form={form as any} isPublic />
      </div>

      <p className="mt-8 mb-4 text-xs text-muted-foreground">
        Powered by VizPortal
      </p>
    </div>
  );
}

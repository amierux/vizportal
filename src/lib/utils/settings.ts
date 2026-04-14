import { createClient } from "@supabase/supabase-js";

const DEFAULTS: Record<string, string> = {
  app_url: "https://vizportal.vercel.app",
  email_sender_address: "noreply@vizserve.com",
  email_sender_name: "VizPortal",
};

const ENV_MAP: Record<string, string> = {
  resend_api_key: "RESEND_API_KEY",
  cron_secret: "CRON_SECRET",
  app_url: "NEXT_PUBLIC_APP_URL",
};

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Get a system setting value.
 * Resolution order: DB → env var → hardcoded default → null
 */
export async function getSystemSetting(
  key: string,
  companyId?: string
): Promise<string | null> {
  try {
    const supabase = createAdminClient();

    let query = supabase
      .from("system_settings")
      .select("value")
      .eq("key", key);

    if (companyId) {
      query = query.eq("company_id", companyId);
    }

    const { data } = await query.limit(1).single();

    if (data?.value) return data.value;
  } catch {
    // DB lookup failed — fall through to env/default
  }

  // Env var fallback
  const envKey = ENV_MAP[key];
  if (envKey && process.env[envKey]) {
    return process.env[envKey]!;
  }

  // Hardcoded default
  return DEFAULTS[key] ?? null;
}

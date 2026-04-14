import { createClient } from "@supabase/supabase-js";

const FALLBACK_TIMEZONE = "Asia/Singapore";

export const TIMEZONE_OPTIONS = [
  { value: "Asia/Singapore", label: "Singapore (SGT, UTC+8)" },
  { value: "Asia/Manila", label: "Manila (PHT, UTC+8)" },
  { value: "Asia/Tokyo", label: "Tokyo (JST, UTC+9)" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT, UTC+8)" },
  { value: "Asia/Shanghai", label: "Shanghai (CST, UTC+8)" },
  { value: "Asia/Kolkata", label: "India (IST, UTC+5:30)" },
  { value: "Asia/Dubai", label: "Dubai (GST, UTC+4)" },
  { value: "Australia/Sydney", label: "Sydney (AEST, UTC+10)" },
  { value: "Europe/London", label: "London (GMT/BST)" },
  { value: "America/New_York", label: "New York (EST/EDT)" },
  { value: "America/Los_Angeles", label: "Los Angeles (PST/PDT)" },
  { value: "Pacific/Auckland", label: "Auckland (NZST, UTC+12)" },
  { value: "UTC", label: "UTC" },
] as const;

export const COUNTRY_OPTIONS = [
  { value: "PH", label: "Philippines" },
  { value: "SG", label: "Singapore" },
  { value: "US", label: "United States" },
  { value: "AU", label: "Australia" },
  { value: "JP", label: "Japan" },
  { value: "GB", label: "United Kingdom" },
] as const;

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

/**
 * Get company timezone. Falls back to Asia/Singapore.
 */
export async function getCompanyTimezone(companyId?: string): Promise<string> {
  try {
    const supabase = createAdminClient();
    let query = supabase.from("companies").select("timezone");
    if (companyId) query = query.eq("id", companyId);
    const { data } = await query.limit(1).single();
    return data?.timezone ?? FALLBACK_TIMEZONE;
  } catch {
    return FALLBACK_TIMEZONE;
  }
}

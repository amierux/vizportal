export const SETTING_KEYS = [
  { key: "resend_api_key", label: "Resend API Key", isSecret: true },
  { key: "cron_secret", label: "Cron Secret", isSecret: true },
  { key: "app_url", label: "Application URL", isSecret: false },
  { key: "email_sender_address", label: "Sender Email Address", isSecret: false },
  { key: "email_sender_name", label: "Sender Display Name", isSecret: false },
] as const;

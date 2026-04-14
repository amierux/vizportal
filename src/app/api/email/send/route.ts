import { NextResponse } from "next/server";
import { sendEmail } from "@/lib/utils/email";
import { getSystemSetting } from "@/lib/utils/settings";

export async function POST(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = await getSystemSetting("cron_secret");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { to, subject, html } = body;

    if (!to || !subject || !html) {
      return NextResponse.json(
        { error: "Missing required fields: to, subject, html" },
        { status: 400 }
      );
    }

    const result = await sendEmail({ to, subject, html });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }
}

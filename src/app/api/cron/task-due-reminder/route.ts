import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { getSystemSetting } from "@/lib/utils/settings";

function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}

function getTomorrowDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = await getSystemSetting("cron_secret");
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createAdminClient();
  const tomorrow = getTomorrowDate();

  // Get tasks due tomorrow that are not done
  const { data: tasks } = await supabase
    .from("workspace_tasks")
    .select("id, name, assignee_id, company_id, workspace_lists:list_id(name)")
    .eq("target_end_date", tomorrow)
    .not("status", "eq", "done")
    .not("assignee_id", "is", null);

  if (!tasks || tasks.length === 0) {
    return NextResponse.json({ success: true, reminders_sent: 0 });
  }

  let sent = 0;

  for (const task of tasks) {
    if (!task.assignee_id || !task.company_id) continue;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const listName = (task.workspace_lists as any)?.name ?? "Workspace";

    await supabase.from("notifications").insert({
      company_id: task.company_id,
      profile_id: task.assignee_id,
      type: "task_due_tomorrow",
      title: "Task Due Tomorrow",
      message: `"${task.name}" in ${listName} is due tomorrow (${tomorrow}). Make sure it's completed on time.`,
      link: `/workspace/tasks/${task.id}`,
      is_read: false,
    });

    sent++;
  }

  return NextResponse.json({
    success: true,
    due_date: tomorrow,
    tasks_found: tasks.length,
    reminders_sent: sent,
  });
}

/**
 * Expand Test Co. with more data so every module has visible entries for any user.
 * Run AFTER seed-test-tenant.mjs.
 */
import { createClient } from "@supabase/supabase-js";

const URL = "https://eptcwyydyftufptosgrw.supabase.co";
const SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdGN3eXlkeWZ0dWZwdG9zZ3J3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA4ODYwNCwiZXhwIjoyMDkxNjY0NjA0fQ.iGqdys_9wI5kUKD03zLQHdzbq8cEtG3IUuEk6PLokDQ";
const s = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const CID = "b1111111-1111-4111-8111-111111111111";

function pass(l) { console.log(`  ✓ ${l}`); }
function section(s) { console.log(`\n=== ${s} ===`); }

async function main() {
  // Fetch all test users
  const { data: profiles } = await s.from("profiles").select("id, email, first_name, last_name").eq("company_id", CID);
  const users = Object.fromEntries(profiles.map((p) => [p.email.split("@")[0], p]));
  pass(`found ${profiles.length} test users`);

  // Fetch test company data
  const { data: folder } = await s.from("workspace_folders").select("id").eq("company_id", CID).single();
  const { data: list } = await s.from("workspace_lists").select("id").eq("folder_id", folder.id).single();
  const { data: statuses } = await s.from("workspace_folder_statuses").select("id, name, position, is_done").eq("folder_id", folder.id);
  const todoStatus = statuses.find((s) => s.position === 1).id;
  const inProgressStatus = statuses.find((s) => s.position === 2).id;
  const doneStatus = statuses.find((s) => s.is_done).id;

  section("Attendance for admin, hr, dev2, salesRep");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const targets = [users.admin.id, users.hr.id, users.dev2.id, users.salesRep.id];
  for (const profileId of targets) {
    for (let i = 1; i <= 5; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
      const dateStr = d.toISOString().split("T")[0];
      const clockIn = new Date(d); clockIn.setHours(8, 0, 0, 0);
      const clockOut = new Date(d); clockOut.setHours(17, 0, 0, 0);
      await s.from("clock_entries").insert([
        { company_id: CID, profile_id: profileId, type: "clock_in", timestamp: clockIn.toISOString(), date: dateStr },
        { company_id: CID, profile_id: profileId, type: "clock_out", timestamp: clockOut.toISOString(), date: dateStr },
      ]);
      await s.from("daily_attendance_summary").insert({
        profile_id: profileId, company_id: CID, date: dateStr,
        total_hours: 9, required_hours: 9,
        is_late: false, late_minutes: 0, status: "present",
      }).then(() => null, () => null); // ignore duplicates
    }
  }
  pass("seeded attendance for 4 more users");

  section("Leave balances + approved requests for admin, hr, dev2");
  const year = new Date().getFullYear();
  const { data: leaveTypes } = await s.from("leave_types").select("id, code, default_days").eq("company_id", CID);
  const vl = leaveTypes.find((l) => l.code === "VL");
  const sl = leaveTypes.find((l) => l.code === "SL");
  for (const profileId of [users.admin.id, users.hr.id, users.dev2.id]) {
    for (const lt of [vl, sl]) {
      await s.from("leave_balances").insert({
        profile_id: profileId, company_id: CID,
        leave_type_id: lt.id, year,
        total_days: lt.default_days, used_days: 0, remaining_days: lt.default_days,
      }).then(() => null, () => null);
    }
  }
  pass("allocated VL + SL balances for 3 more users");

  // Approved leave for dev2 next week
  const leaveStart = new Date(today); leaveStart.setDate(today.getDate() + 5);
  const leaveEnd = new Date(today); leaveEnd.setDate(today.getDate() + 6);
  await s.from("leave_requests").insert({
    company_id: CID, profile_id: users.dev2.id, leave_type_id: vl.id,
    start_date: leaveStart.toISOString().split("T")[0],
    end_date: leaveEnd.toISOString().split("T")[0],
    total_days: 2, reason: "Personal time", status: "approved",
  });
  pass("approved leave request for dev2");

  section("Overtime for admin, dev2");
  const otDate = new Date(today); otDate.setDate(today.getDate() - 3);
  while (otDate.getDay() === 0 || otDate.getDay() === 6) otDate.setDate(otDate.getDate() - 1);
  await s.from("overtime_requests").insert([
    {
      company_id: CID, profile_id: users.admin.id,
      date: otDate.toISOString().split("T")[0],
      start_time: "18:00", end_time: "20:00", total_hours: 2,
      reason: "Admin work", status: "approved",
    },
    {
      company_id: CID, profile_id: users.dev2.id,
      date: otDate.toISOString().split("T")[0],
      start_time: "17:30", end_time: "21:00", total_hours: 3.5,
      reason: "Bug fix", status: "pending",
    },
  ]);
  pass("overtime for admin (approved) + dev2 (pending)");

  section("Payroll entries for all active users");
  const { data: period } = await s.from("payroll_periods").select("id, start_date, end_date").eq("company_id", CID).single();
  for (const userKey of ["admin", "hr", "dev2", "salesRep", "engTl", "salesTl"]) {
    const u = users[userKey];
    if (!u) continue;
    const { data: ed } = await s.from("employee_details").select("salary").eq("profile_id", u.id).single();
    const salary = ed?.salary ?? 30000;
    const basicPay = salary / 2;
    const sss = Math.min(900, salary * 0.045);
    const ph = Math.max(250, Math.min(2500, salary * 0.025));
    const pi = salary > 1500 ? 100 : 15;
    const totalDed = sss + ph + pi;
    await s.from("payroll_entries").insert({
      payroll_period_id: period.id, profile_id: u.id, company_id: CID,
      basic_salary: salary, daily_rate: salary / 22, hourly_rate: salary / 22 / 8,
      days_worked: 11, days_absent: 0, days_late: 0, late_minutes_total: 0,
      undertime_minutes_total: 0, ot_regular_hours: 0, ot_rest_day_hours: 0, ot_holiday_hours: 0,
      paid_leave_days: 0, unpaid_leave_days: 0, holiday_pay_days: 0,
      basic_pay: basicPay, ot_pay: 0, holiday_pay: 0,
      late_deduction: 0, undertime_deduction: 0, absent_deduction: 0, unpaid_leave_deduction: 0,
      gross_pay: basicPay,
      sss_contribution: sss, philhealth_contribution: ph, pagibig_contribution: pi, withholding_tax: 0,
      custom_deductions_total: 0, total_deductions: totalDed,
      net_pay: basicPay - totalDed,
    }).then(() => null, () => null);
  }
  pass("payroll entries for 6 more users");

  section("Workspace: add admin/HR to folder + create tasks for each user");
  await s.from("workspace_folder_members").insert([
    { folder_id: folder.id, profile_id: users.admin.id, permission: "admin" },
    { folder_id: folder.id, profile_id: users.hr.id, permission: "editor" },
    { folder_id: folder.id, profile_id: users.bm.id, permission: "editor" },
    { folder_id: folder.id, profile_id: users.director.id, permission: "viewer" },
  ]).then(() => null, () => null);

  const { data: existingTasks } = await s.from("workspace_tasks").select("position").eq("list_id", list.id).order("position", { ascending: false }).limit(1);
  let pos = (existingTasks?.[0]?.position ?? 2) + 1;
  const taskSpecs = [
    { name: "Review quarterly report", assignee: users.admin.id, status: todoStatus, priority: "high" },
    { name: "Onboarding checklist review", assignee: users.hr.id, status: inProgressStatus, priority: "medium" },
    { name: "Update API docs", assignee: users.dev2.id, status: todoStatus, priority: "low" },
    { name: "Q1 sales pipeline review", assignee: users.salesTl.id, status: inProgressStatus, priority: "high" },
    { name: "Approve annual leave requests", assignee: users.engDm.id, status: todoStatus, priority: "medium" },
  ];
  for (const t of taskSpecs) {
    await s.from("workspace_tasks").insert({
      list_id: list.id, company_id: CID,
      name: t.name, status_id: t.status, assignee_id: t.assignee,
      created_by: users.admin.id, priority: t.priority, position: pos++,
      target_end_date: new Date(today.getTime() + 7 * 86400000).toISOString().split("T")[0],
    });
  }
  pass("added admin/HR as folder members + 5 new tasks (one per role)");

  section("Timesheet entries for admin, hr, dev2");
  const weekStart = new Date(today);
  while (weekStart.getDay() !== 1) weekStart.setDate(weekStart.getDate() - 1);
  const { data: adminTasks } = await s.from("workspace_tasks").select("id").eq("assignee_id", users.admin.id).limit(1);
  const { data: hrTasks } = await s.from("workspace_tasks").select("id").eq("assignee_id", users.hr.id).limit(1);
  const { data: dev2Tasks } = await s.from("workspace_tasks").select("id").eq("assignee_id", users.dev2.id).limit(1);

  for (const [uKey, tasks] of [["admin", adminTasks], ["hr", hrTasks], ["dev2", dev2Tasks]]) {
    if (!tasks || tasks.length === 0) continue;
    const u = users[uKey];
    for (let i = 0; i < 5; i++) {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      await s.from("workspace_time_entries").insert({
        task_id: tasks[0].id, profile_id: u.id, company_id: CID,
        duration_minutes: 480, description: `${uKey} day ${i + 1}`,
        date: d.toISOString().split("T")[0], is_billable: uKey !== "admin",
      });
    }
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    await s.from("timesheet_submissions").insert({
      profile_id: u.id, company_id: CID,
      week_start_date: weekStart.toISOString().split("T")[0],
      week_end_date: weekEnd.toISOString().split("T")[0],
      total_minutes: 2400, status: uKey === "admin" ? "approved" : "submitted",
      submitted_at: new Date().toISOString(),
    }).then(() => null, () => null);
  }
  pass("timesheet entries for 3 more users");

  section("Forms: assign to dev1 + dev2, add more submissions");
  const { data: form } = await s.from("forms").select("id").eq("company_id", CID).single();
  const { data: fields } = await s.from("form_fields").select("id").eq("form_id", form.id);
  await s.from("form_assignments").insert([
    { form_id: form.id, profile_id: users.dev1.id },
    { form_id: form.id, profile_id: users.dev2.id },
    { form_id: form.id, profile_id: users.salesRep.id },
  ]).then(() => null, () => null);

  // Additional submissions
  if (fields.length >= 2) {
    await s.from("form_submissions").insert([
      {
        form_id: form.id, company_id: CID, submitted_by: users.hr.id,
        status: "submitted",
        data: { [fields[0].id]: "HR Officer", [fields[1].id]: "2025-02-01" },
        submitted_at: new Date().toISOString(),
      },
      {
        form_id: form.id, company_id: CID, submitted_by: users.dev2.id,
        status: "submitted",
        data: { [fields[0].id]: "Dev Two", [fields[1].id]: "2025-03-01" },
        submitted_at: new Date().toISOString(),
      },
    ]);
  }
  pass("3 form assignments + 2 more submissions");

  section("Dashboard widgets for all users");
  const widgetTypes = [
    "attendance_today", "my_tasks_summary", "timesheet_week", "leave_balances",
    "pending_forms", "overtime_month", "payroll_summary",
  ];
  for (const userKey of ["hr", "director", "bm", "engTl", "engDm", "dev1", "dev2", "salesTl", "salesRep"]) {
    const u = users[userKey];
    if (!u) continue;
    const { data: existing } = await s.from("dashboard_widgets").select("id").eq("profile_id", u.id).limit(1);
    if (existing && existing.length > 0) continue;
    await s.from("dashboard_widgets").insert(
      widgetTypes.map((type, i) => ({
        profile_id: u.id, company_id: CID, widget_type: type, position: i,
        size: i < 3 ? "small" : "medium",
      }))
    );
  }
  pass("dashboard widgets seeded for all users");

  section("Non-working days (holidays for Test Co.)");
  await s.from("non_working_days").insert([
    { company_id: CID, name: "New Year's Day", date: `${year}-01-01`, is_recurring: true, country: "PH" },
    { company_id: CID, name: "Labor Day", date: `${year}-05-01`, is_recurring: true, country: "PH" },
    { company_id: CID, name: "Christmas Day", date: `${year}-12-25`, is_recurring: true, country: "PH" },
    { company_id: CID, name: "Rizal Day", date: `${year}-12-30`, is_recurring: true, country: "PH" },
  ]).then(() => null, () => null);
  pass("4 PH holidays configured");

  section("Custom deduction types");
  await s.from("custom_deduction_types").insert([
    { company_id: CID, name: "Company Loan" },
    { company_id: CID, name: "Cash Advance" },
    { company_id: CID, name: "Uniform" },
  ]).then(() => null, () => null);
  pass("3 custom deduction types");

  section("Summary");
  console.log("\nData counts in Test Co.:");
  for (const t of [
    "profiles", "departments", "leave_types", "leave_balances", "leave_requests",
    "overtime_requests", "daily_attendance_summary", "payroll_entries",
    "workspace_folders", "workspace_tasks", "workspace_time_entries",
    "timesheet_submissions", "forms", "form_submissions", "dashboard_widgets",
    "non_working_days",
  ]) {
    const { count } = await s.from(t).select("*", { count: "exact", head: true }).eq("company_id", CID);
    console.log(`  ${t}: ${count}`);
  }
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });

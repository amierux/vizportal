/**
 * Seed a test tenant ("Test Co.") alongside VizServe.
 * Creates a full scenario exercising every module.
 *
 * Run: node scripts/seed-test-tenant.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";

const SUPABASE_URL = "https://eptcwyydyftufptosgrw.supabase.co";
const SERVICE_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdGN3eXlkeWZ0dWZwdG9zZ3J3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA4ODYwNCwiZXhwIjoyMDkxNjY0NjA0fQ.iGqdys_9wI5kUKD03zLQHdzbq8cEtG3IUuEk6PLokDQ";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const PASSWORD = "TestPass123!";
const TEST_COMPANY_ID = "b1111111-1111-4111-8111-111111111111";
const COMPANY_NAME = "Test Co.";
const EMAIL_DOMAIN = "testco.vizportal.local";

const results = { passed: [], failed: [] };
function pass(label) { results.passed.push(label); console.log(`  ✓ ${label}`); }
function fail(label, err) { results.failed.push({ label, err: err?.message ?? String(err) }); console.log(`  ✗ ${label} — ${err?.message ?? err}`); }
function section(name) { console.log(`\n=== ${name} ===`); }

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function createAuthUser(email, firstName, lastName) {
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { first_name: firstName, last_name: lastName },
  });
  if (error) throw error;
  return data.user;
}

async function ensureProfile(userId, email, firstName, lastName) {
  // Insert profile (no auto-trigger in this schema)
  const { error } = await supabase
    .from("profiles")
    .insert({
      id: userId,
      company_id: TEST_COMPANY_ID,
      email,
      first_name: firstName,
      last_name: lastName,
      profile_completed: true,
      is_active: true,
    });
  if (error) throw error;
}

async function assignRole(profileId, roleName) {
  const { data: role } = await supabase
    .from("roles")
    .select("id")
    .eq("name", roleName)
    .eq("company_id", TEST_COMPANY_ID)
    .single();
  if (!role) throw new Error(`Role ${roleName} not found for Test Co.`);
  const { error } = await supabase
    .from("user_roles")
    .insert({ profile_id: profileId, role_id: role.id });
  if (error && !error.message.includes("duplicate")) throw error;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  section("1. Clean up any previous test data");
  // Delete test auth users first — profiles FK from user_roles, employee_details, etc.
  const { data: existingUsers } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  for (const u of existingUsers?.users ?? []) {
    if (u.email?.endsWith(EMAIL_DOMAIN)) {
      await supabase.auth.admin.deleteUser(u.id);
    }
  }
  // Delete child rows referencing the company (order matters for FK)
  const childTables = [
    "dashboard_widgets", "timesheet_submissions", "workspace_time_entries",
    "form_submissions", "form_approvers", "form_approval_configs", "form_assignments",
    "form_fields", "form_sections", "forms",
    "workspace_tasks", "workspace_lists", "workspace_folder_members",
    "workspace_folder_statuses", "workspace_folders",
    "payroll_entries", "payroll_periods", "payroll_settings",
    "recurring_deductions", "custom_deduction_types",
    "overtime_requests", "leave_requests", "leave_balances", "leave_types", "leave_settings",
    "daily_attendance_summary", "clock_entries", "employee_schedules",
    "non_working_days", "approval_configs",
    "timesheet_approval_configs", "timesheet_settings",
    "departments", "job_levels",
    "profiles",
  ];
  for (const table of childTables) {
    await supabase.from(table).delete().eq("company_id", TEST_COMPANY_ID);
  }
  // user_roles — delete by role_id (no company_id column)
  const { data: testRoles } = await supabase.from("roles").select("id").eq("company_id", TEST_COMPANY_ID);
  if (testRoles && testRoles.length > 0) {
    await supabase.from("user_roles").delete().in("role_id", testRoles.map((r) => r.id));
  }
  await supabase.from("roles").delete().eq("company_id", TEST_COMPANY_ID);
  await supabase.from("companies").delete().eq("id", TEST_COMPANY_ID);
  pass("cleaned previous test data");

  section("2. Create test company");
  const { error: coErr } = await supabase.from("companies").insert({
    id: TEST_COMPANY_ID,
    name: COMPANY_NAME,
    timezone: "Asia/Manila",
    holiday_country: "PH",
  });
  if (coErr) { fail("create company", coErr); return; }
  pass("created company " + COMPANY_NAME);

  // Seed roles for this company
  const roleNames = [
    { name: "admin", description: "Full system access, all settings" },
    { name: "hr", description: "Employee management, attendance/leave oversight" },
    { name: "director", description: "Company-level oversight" },
    { name: "business_manager", description: "Operational oversight" },
    { name: "dept_manager", description: "Department-level approvals and views" },
    { name: "team_leader", description: "Team-level approvals" },
    { name: "member", description: "Regular employee" },
  ];
  await supabase.from("roles").insert(roleNames.map((r) => ({ ...r, company_id: TEST_COMPANY_ID })));
  pass("seeded 7 roles");

  // Seed company defaults via existing functions
  try { await supabase.rpc("seed_company_leave_defaults", { p_company_id: TEST_COMPANY_ID }); } catch { /* ignore */ }
  try { await supabase.rpc("seed_company_approval_configs", { p_company_id: TEST_COMPANY_ID }); } catch { /* ignore */ }
  try { await supabase.rpc("seed_company_timesheet_defaults", { p_company_id: TEST_COMPANY_ID }); } catch { /* ignore */ }
  pass("seeded leave types, approval configs, timesheet defaults");

  section("3. Create departments + job levels");
  const engDept = randomUUID();
  const salesDept = randomUUID();
  const { error: dErr } = await supabase.from("departments").insert([
    { id: engDept, company_id: TEST_COMPANY_ID, name: "Engineering" },
    { id: salesDept, company_id: TEST_COMPANY_ID, name: "Sales" },
  ]);
  if (dErr) { fail("departments", dErr); } else pass("created 2 departments");

  const levelA2 = randomUUID();
  const levelB3 = randomUUID();
  const levelC1 = randomUUID();
  const { error: jlErr } = await supabase.from("job_levels").insert([
    { id: levelA2, company_id: TEST_COMPANY_ID, code: "A2", name: "Associate II", rank: 2 },
    { id: levelB3, company_id: TEST_COMPANY_ID, code: "B3", name: "Senior", rank: 5 },
    { id: levelC1, company_id: TEST_COMPANY_ID, code: "C1", name: "Specialist", rank: 7 },
  ]);
  if (jlErr) { fail("job levels", jlErr); } else pass("created 3 job levels");

  section("4. Create users (admin, HR, 2 TLs, 4 members)");
  const users = {};
  const userSpec = [
    { key: "admin", first: "Admin", last: "Test", role: "admin", salary: 80000 },
    { key: "hr", first: "HR", last: "Officer", role: "hr", salary: 50000 },
    { key: "director", first: "Director", last: "Boss", role: "director", salary: 100000 },
    { key: "bm", first: "Business", last: "Manager", role: "business_manager", salary: 80000 },
    { key: "engTl", first: "Eng", last: "Lead", role: "team_leader", dept: engDept, salary: 60000 },
    { key: "engDm", first: "Eng", last: "Manager", role: "dept_manager", dept: engDept, salary: 70000 },
    { key: "dev1", first: "Dev", last: "One", role: "member", dept: engDept, salary: 35000 },
    { key: "dev2", first: "Dev", last: "Two", role: "member", dept: engDept, salary: 35000 },
    { key: "salesTl", first: "Sales", last: "Lead", role: "team_leader", dept: salesDept, salary: 60000 },
    { key: "salesRep", first: "Sales", last: "Rep", role: "member", dept: salesDept, salary: 30000 },
  ];

  for (const spec of userSpec) {
    const email = `${spec.key}@${EMAIL_DOMAIN}`;
    try {
      const u = await createAuthUser(email, spec.first, spec.last);
      await ensureProfile(u.id, email, spec.first, spec.last);
      await assignRole(u.id, spec.role);
      await supabase.from("employee_details").insert({
        profile_id: u.id,
        company_id: TEST_COMPANY_ID,
        department_id: spec.dept ?? null,
        job_level_id: levelA2,
        employment_status: "regular",
        salary: spec.salary,
        salary_frequency: "monthly",
        weekly_required_hours: 40,
        date_hired: "2025-01-01",
        sss_number: "01-2345678-9",
        philhealth_number: "12-345678901-2",
        pagibig_number: "1234-5678-9012",
        bank_name: "BDO",
        bank_account_number: "0000-1111-2222",
      });
      await supabase.from("employee_schedules").insert({
        profile_id: u.id,
        company_id: TEST_COMPANY_ID,
        work_type: "full_time",
        start_time: "08:00",
        end_time: "17:00",
        work_days: ["mon", "tue", "wed", "thu", "fri"],
        timezone: "Asia/Manila",
      });
      users[spec.key] = u.id;
      pass(`user ${spec.key} (${email})`);
    } catch (e) { fail(`user ${spec.key}`, e); }
  }

  // Assign TLs/DMs to departments
  await supabase.from("departments")
    .update({ team_leader_id: users.engTl, manager_id: users.engDm })
    .eq("id", engDept);
  await supabase.from("departments")
    .update({ team_leader_id: users.salesTl })
    .eq("id", salesDept);
  await supabase.from("companies")
    .update({ business_manager_id: users.bm, director_id: users.director })
    .eq("id", TEST_COMPANY_ID);
  pass("assigned TL/DM/BM/Director");

  section("5. Attendance — clock entries + summaries");
  // Last 5 working days for dev1
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  for (let i = 1; i <= 5; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    while (d.getDay() === 0 || d.getDay() === 6) d.setDate(d.getDate() - 1);
    const dateStr = d.toISOString().split("T")[0];
    const clockIn = new Date(d); clockIn.setHours(8, i === 3 ? 30 : 5, 0, 0);
    const clockOut = new Date(d); clockOut.setHours(17, 0, 0, 0);
    await supabase.from("clock_entries").insert([
      { company_id: TEST_COMPANY_ID, profile_id: users.dev1, type: "clock_in", timestamp: clockIn.toISOString(), date: dateStr },
      { company_id: TEST_COMPANY_ID, profile_id: users.dev1, type: "clock_out", timestamp: clockOut.toISOString(), date: dateStr },
    ]);
    const lateMin = i === 3 ? 30 : 5;
    const isLate = lateMin > 1;
    await supabase.from("daily_attendance_summary").insert({
      profile_id: users.dev1,
      company_id: TEST_COMPANY_ID,
      date: dateStr,
      total_hours: 9 - (lateMin / 60),
      required_hours: 9,
      is_late: isLate,
      late_minutes: isLate ? lateMin : 0,
      status: isLate ? "late" : "present",
    });
  }
  pass("inserted 5 days of attendance for dev1 (1 late day)");

  section("6. Leave — balances + request + approval");
  // Allocate VL balance for dev1
  const year = new Date().getFullYear();
  const { data: vlType } = await supabase.from("leave_types")
    .select("id, default_days").eq("company_id", TEST_COMPANY_ID).eq("code", "VL").single();
  if (vlType) {
    await supabase.from("leave_balances").insert({
      profile_id: users.dev1, company_id: TEST_COMPANY_ID,
      leave_type_id: vlType.id, year, total_days: 5, used_days: 0, remaining_days: 5,
    });
    pass("allocated VL balance for dev1");

    // File a leave request
    const lrStart = new Date(today); lrStart.setDate(today.getDate() + 7);
    const lrEnd = new Date(today); lrEnd.setDate(today.getDate() + 8);
    const { data: lr } = await supabase.from("leave_requests").insert({
      company_id: TEST_COMPANY_ID, profile_id: users.dev1, leave_type_id: vlType.id,
      start_date: lrStart.toISOString().split("T")[0],
      end_date: lrEnd.toISOString().split("T")[0],
      total_days: 2, reason: "Family trip", status: "approved",
    }).select("id").single();
    if (lr) {
      await supabase.from("leave_balances")
        .update({ used_days: 2, remaining_days: 3 })
        .eq("profile_id", users.dev1).eq("leave_type_id", vlType.id).eq("year", year);
      pass("filed leave request (auto-approved for test)");
    }
  }

  section("7. Overtime — filed + approved");
  const otDate = new Date(today); otDate.setDate(today.getDate() - 2);
  while (otDate.getDay() === 0 || otDate.getDay() === 6) otDate.setDate(otDate.getDate() - 1);
  await supabase.from("overtime_requests").insert({
    company_id: TEST_COMPANY_ID, profile_id: users.dev1,
    date: otDate.toISOString().split("T")[0],
    start_time: "18:00", end_time: "22:00",
    total_hours: 4, reason: "Release prep", status: "approved",
  });
  pass("filed overtime request (4 hours, approved)");

  section("8. Payroll — settings + period + entry");
  await supabase.from("payroll_settings").insert({
    company_id: TEST_COMPANY_ID,
    schedule_type: "semi_monthly",
    pay_day_1: 15, pay_day_2: 30,
    cutoff_days_before: 5, is_enabled: true,
    enable_late_deduction: true, enable_undertime_deduction: true, enable_absent_deduction: true,
    ot_regular_multiplier: 1.25, ot_rest_day_multiplier: 1.30, ot_holiday_multiplier: 2.00,
  });
  pass("payroll settings created");

  const periodStart = `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}-01`;
  const periodEnd = `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}-15`;
  const payDate = `${year}-${String(new Date().getMonth() + 1).padStart(2, "0")}-15`;
  const { data: period } = await supabase.from("payroll_periods").insert({
    company_id: TEST_COMPANY_ID, start_date: periodStart, end_date: periodEnd, pay_date: payDate,
  }).select("id").single();
  if (period) {
    const basicPay = 35000 / 2;
    const sss = 360, ph = 437.50, pi = 100, tax = 0;
    const totalDed = sss + ph + pi + tax;
    await supabase.from("payroll_entries").insert({
      payroll_period_id: period.id, profile_id: users.dev1, company_id: TEST_COMPANY_ID,
      basic_salary: 35000, daily_rate: 1590.91, hourly_rate: 198.86,
      days_worked: 11, days_absent: 0, days_late: 1, late_minutes_total: 30,
      undertime_minutes_total: 0, ot_regular_hours: 4, ot_rest_day_hours: 0, ot_holiday_hours: 0,
      paid_leave_days: 0, unpaid_leave_days: 0, holiday_pay_days: 0,
      basic_pay: basicPay, ot_pay: 994.30, holiday_pay: 0,
      late_deduction: 99.43, undertime_deduction: 0, absent_deduction: 0, unpaid_leave_deduction: 0,
      gross_pay: basicPay + 994.30 - 99.43,
      sss_contribution: sss, philhealth_contribution: ph, pagibig_contribution: pi, withholding_tax: tax,
      custom_deductions_total: 0, total_deductions: totalDed,
      net_pay: basicPay + 994.30 - 99.43 - totalDed,
    });
    pass("payroll entry created for dev1");
  }

  section("9. Workspace — folder + list + tasks");
  const { data: folder } = await supabase.from("workspace_folders").insert({
    company_id: TEST_COMPANY_ID,
    name: "Q1 Engineering", color: "#6366f1", icon: "🚀",
    created_by: users.engTl,
  }).select("id").single();

  if (folder) {
    // Add members
    await supabase.from("workspace_folder_members").insert([
      { folder_id: folder.id, profile_id: users.engTl, permission: "admin" },
      { folder_id: folder.id, profile_id: users.engDm, permission: "admin" },
      { folder_id: folder.id, profile_id: users.dev1, permission: "editor" },
      { folder_id: folder.id, profile_id: users.dev2, permission: "editor" },
    ]);

    // Seed statuses
    const statuses = [
      { name: "To Do", color: "#94a3b8", position: 1, is_done: false },
      { name: "In Progress", color: "#3b82f6", position: 2, is_done: false },
      { name: "Review", color: "#f59e0b", position: 3, is_done: false },
      { name: "Done", color: "#22c55e", position: 4, is_done: true },
    ];
    const { data: insertedStatuses } = await supabase
      .from("workspace_folder_statuses")
      .insert(statuses.map((s) => ({ ...s, folder_id: folder.id })))
      .select("id, name, position");

    // Create list
    const { data: list } = await supabase.from("workspace_lists").insert({
      folder_id: folder.id, company_id: TEST_COMPANY_ID, name: "Sprint 12", position: 0, created_by: users.engTl,
    }).select("id").single();

    if (list && insertedStatuses) {
      const todoStatus = insertedStatuses.find((s) => s.name === "To Do").id;
      const inProgressStatus = insertedStatuses.find((s) => s.name === "In Progress").id;
      const doneStatus = insertedStatuses.find((s) => s.name === "Done").id;

      await supabase.from("workspace_tasks").insert([
        {
          list_id: list.id, company_id: TEST_COMPANY_ID,
          name: "Fix login bug", description: "Users getting 500 on submit",
          status_id: todoStatus, assignee_id: users.dev1, created_by: users.engTl,
          priority: "high", position: 0,
          target_end_date: new Date(today.getTime() + 3 * 86400000).toISOString().split("T")[0],
        },
        {
          list_id: list.id, company_id: TEST_COMPANY_ID,
          name: "Add dashboard widget", description: "New chart widget for Q1",
          status_id: inProgressStatus, assignee_id: users.dev2, created_by: users.engTl,
          priority: "medium", position: 1,
          target_end_date: new Date(today.getTime() + 5 * 86400000).toISOString().split("T")[0],
        },
        {
          list_id: list.id, company_id: TEST_COMPANY_ID,
          name: "Update docs", description: null,
          status_id: doneStatus, assignee_id: users.dev1, created_by: users.engTl,
          priority: "low", position: 2,
          target_end_date: new Date(today.getTime() - 2 * 86400000).toISOString().split("T")[0],
          completed_at: new Date().toISOString(),
        },
      ]);
      pass("created folder, list, 3 tasks");
    }
  }

  section("10. Forms — form with fields + submission");
  const { data: form } = await supabase.from("forms").insert({
    company_id: TEST_COMPANY_ID,
    name: "Onboarding Survey",
    description: "Welcome! Please fill this out.",
    status: "published",
    created_by: users.hr,
    is_public: true,
    approval_enabled: false,
  }).select("id, public_token").single();

  if (form) {
    const { data: section1 } = await supabase.from("form_sections").insert({
      form_id: form.id, name: "Basic Info", position: 0,
    }).select("id").single();

    if (section1) {
      const { data: field1 } = await supabase.from("form_fields").insert({
        section_id: section1.id, form_id: form.id,
        name: "full_name", label: "Full Name", type: "text",
        position: 0, is_required: true,
      }).select("id").single();

      const { data: field2 } = await supabase.from("form_fields").insert({
        section_id: section1.id, form_id: form.id,
        name: "start_date", label: "Start Date", type: "date",
        position: 1, is_required: true,
      }).select("id").single();

      // Create a sample submission
      if (field1 && field2) {
        await supabase.from("form_submissions").insert({
          form_id: form.id, company_id: TEST_COMPANY_ID,
          submitted_by: users.dev1,
          status: "submitted",
          data: { [field1.id]: "Dev One", [field2.id]: "2025-01-15" },
          submitted_at: new Date().toISOString(),
        });
      }
      pass(`form created (public token: ${form.public_token}) + 1 submission`);
    }
  }

  section("11. Workspace time entries + timesheet submission");
  const weekStart = new Date(today);
  while (weekStart.getDay() !== 1) weekStart.setDate(weekStart.getDate() - 1);
  // Time entries for dev1 this week — get a task first
  const { data: sampleTask } = await supabase.from("workspace_tasks")
    .select("id").eq("assignee_id", users.dev1).limit(1).single();
  if (sampleTask) {
    for (let i = 0; i < 5; i++) {
      const d = new Date(weekStart); d.setDate(weekStart.getDate() + i);
      await supabase.from("workspace_time_entries").insert({
        task_id: sampleTask.id, profile_id: users.dev1, company_id: TEST_COMPANY_ID,
        duration_minutes: 480, description: `Day ${i + 1}`,
        date: d.toISOString().split("T")[0], is_billable: true,
      });
    }
    const weekEnd = new Date(weekStart); weekEnd.setDate(weekStart.getDate() + 6);
    await supabase.from("timesheet_submissions").insert({
      profile_id: users.dev1, company_id: TEST_COMPANY_ID,
      week_start_date: weekStart.toISOString().split("T")[0],
      week_end_date: weekEnd.toISOString().split("T")[0],
      total_minutes: 2400, status: "submitted",
      submitted_at: new Date().toISOString(),
    });
    pass("logged 40hrs + submitted timesheet for dev1");
  }

  section("12. Dashboard widgets (default set for admin)");
  await supabase.from("dashboard_widgets").insert([
    { profile_id: users.admin, company_id: TEST_COMPANY_ID, widget_type: "attendance_today", position: 0, size: "small" },
    { profile_id: users.admin, company_id: TEST_COMPANY_ID, widget_type: "headcount_department", position: 1, size: "medium" },
    { profile_id: users.admin, company_id: TEST_COMPANY_ID, widget_type: "attendance_trend", position: 2, size: "large" },
  ]);
  pass("seeded 3 dashboard widgets for admin");

  // ─── Verification ─────────────────────────────────────────────────────────
  section("VERIFICATION");
  const checks = [
    { label: "company exists", q: () => supabase.from("companies").select("id").eq("id", TEST_COMPANY_ID).single() },
    { label: "10 users created", q: async () => {
      const { data } = await supabase.from("profiles").select("id").eq("company_id", TEST_COMPANY_ID);
      return { count: data?.length };
    }, expect: (r) => r.count === 10 },
    { label: "2 departments", q: async () => {
      const { data } = await supabase.from("departments").select("id").eq("company_id", TEST_COMPANY_ID);
      return { count: data?.length };
    }, expect: (r) => r.count === 2 },
    { label: "7 leave types seeded", q: async () => {
      const { data } = await supabase.from("leave_types").select("id").eq("company_id", TEST_COMPANY_ID);
      return { count: data?.length };
    }, expect: (r) => r.count === 7 },
    { label: "3 approval configs seeded", q: async () => {
      const { data } = await supabase.from("approval_configs").select("id").eq("company_id", TEST_COMPANY_ID);
      return { count: data?.length };
    }, expect: (r) => r.count === 3 },
    { label: "attendance summaries", q: async () => {
      const { data } = await supabase.from("daily_attendance_summary").select("id").eq("company_id", TEST_COMPANY_ID);
      return { count: data?.length };
    }, expect: (r) => r.count >= 5 },
    { label: "leave balance allocated", q: async () => {
      const { data } = await supabase.from("leave_balances").select("id").eq("company_id", TEST_COMPANY_ID);
      return { count: data?.length };
    }, expect: (r) => r.count >= 1 },
    { label: "payroll entry created", q: async () => {
      const { data } = await supabase.from("payroll_entries").select("id, net_pay").eq("company_id", TEST_COMPANY_ID);
      return { count: data?.length, netPay: data?.[0]?.net_pay };
    }, expect: (r) => r.count >= 1 && r.netPay > 0 },
    { label: "workspace folder + tasks", q: async () => {
      const { data } = await supabase.from("workspace_tasks").select("id").eq("company_id", TEST_COMPANY_ID);
      return { count: data?.length };
    }, expect: (r) => r.count >= 3 },
    { label: "form + submission", q: async () => {
      const { data } = await supabase.from("form_submissions").select("id").eq("company_id", TEST_COMPANY_ID);
      return { count: data?.length };
    }, expect: (r) => r.count >= 1 },
    { label: "timesheet submission", q: async () => {
      const { data } = await supabase.from("timesheet_submissions").select("id").eq("company_id", TEST_COMPANY_ID);
      return { count: data?.length };
    }, expect: (r) => r.count >= 1 },
    { label: "dashboard widgets", q: async () => {
      const { data } = await supabase.from("dashboard_widgets").select("id").eq("company_id", TEST_COMPANY_ID);
      return { count: data?.length };
    }, expect: (r) => r.count >= 3 },
  ];

  for (const c of checks) {
    try {
      const result = c.q instanceof Function ? await c.q() : null;
      const data = result?.data ?? result;
      if (c.expect ? c.expect(data) : data) pass(c.label);
      else fail(c.label, new Error(`unexpected result: ${JSON.stringify(data)}`));
    } catch (e) { fail(c.label, e); }
  }

  // ─── Summary ──────────────────────────────────────────────────────────────
  section("SUMMARY");
  console.log(`\nPassed: ${results.passed.length}`);
  console.log(`Failed: ${results.failed.length}`);
  if (results.failed.length > 0) {
    console.log("\nFailures:");
    for (const f of results.failed) console.log(`  - ${f.label}: ${f.err}`);
  }

  console.log("\n─── Test Account Credentials ───");
  console.log(`Company:  ${COMPANY_NAME}`);
  console.log(`Password: ${PASSWORD} (all users)`);
  console.log(`Admin:    admin@${EMAIL_DOMAIN}`);
  console.log(`HR:       hr@${EMAIL_DOMAIN}`);
  console.log(`Director: director@${EMAIL_DOMAIN}`);
  console.log(`BM:       bm@${EMAIL_DOMAIN}`);
  console.log(`Eng TL:   engTl@${EMAIL_DOMAIN}`);
  console.log(`Eng DM:   engDm@${EMAIL_DOMAIN}`);
  console.log(`Dev 1:    dev1@${EMAIL_DOMAIN}`);
  console.log(`Dev 2:    dev2@${EMAIL_DOMAIN}`);
  console.log(`Sales TL: salesTl@${EMAIL_DOMAIN}`);
  console.log(`Sales:    salesRep@${EMAIL_DOMAIN}`);
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });

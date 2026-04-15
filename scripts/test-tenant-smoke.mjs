/**
 * Smoke tests against Test Co. data.
 * Verifies RLS, role-gated queries, and data integrity.
 */
import { createClient } from "@supabase/supabase-js";

const URL = "https://eptcwyydyftufptosgrw.supabase.co";
const ANON = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdGN3eXlkeWZ0dWZwdG9zZ3J3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYwODg2MDQsImV4cCI6MjA5MTY2NDYwNH0.PRhfi8jrN4lSW7ICm8Af8neRN6FVc9U5hhbAlneC3L4";
const SERVICE = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVwdGN3eXlkeWZ0dWZwdG9zZ3J3Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA4ODYwNCwiZXhwIjoyMDkxNjY0NjA0fQ.iGqdys_9wI5kUKD03zLQHdzbq8cEtG3IUuEk6PLokDQ";
const admin = createClient(URL, SERVICE, { auth: { autoRefreshToken: false, persistSession: false } });

const EMAIL_DOMAIN = "testco.vizportal.local";
const PASSWORD = "TestPass123!";

const results = { pass: [], fail: [] };
function pass(l) { results.pass.push(l); console.log(`  ✓ ${l}`); }
function fail(l, e) { results.fail.push({ l, e: e?.message ?? e }); console.log(`  ✗ ${l} — ${e?.message ?? e}`); }
function section(s) { console.log(`\n=== ${s} ===`); }

async function signIn(email) {
  const c = createClient(URL, ANON);
  const { data, error } = await c.auth.signInWithPassword({ email, password: PASSWORD });
  if (error) throw error;
  return createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }, auth: { autoRefreshToken: false, persistSession: false } });
}

async function main() {
  section("Auth: sign in as admin + dev1");
  let adminClient, dev1Client, devUser;
  try {
    adminClient = await signIn(`admin@${EMAIL_DOMAIN}`);
    pass("admin signed in");
  } catch (e) { fail("admin sign-in", e); return; }
  try {
    const c = createClient(URL, ANON);
    const { data } = await c.auth.signInWithPassword({ email: `dev1@${EMAIL_DOMAIN}`, password: PASSWORD });
    devUser = data.user;
    dev1Client = createClient(URL, ANON, { global: { headers: { Authorization: `Bearer ${data.session.access_token}` } }, auth: { autoRefreshToken: false, persistSession: false } });
    pass("dev1 signed in");
  } catch (e) { fail("dev1 sign-in", e); return; }

  section("Employee Info");
  const { data: profiles } = await adminClient.from("profiles").select("id, email").eq("is_active", true);
  const testProfiles = profiles.filter((p) => p.email?.endsWith(EMAIL_DOMAIN));
  testProfiles.length === 10 ? pass(`admin sees 10 test employees (got ${testProfiles.length})`) : fail("employee count", `expected 10 got ${testProfiles.length}`);

  const { data: dev1Profiles } = await dev1Client.from("profiles").select("id, email");
  dev1Profiles.length >= 1 ? pass(`dev1 can see profiles (${dev1Profiles.length} visible)`) : fail("dev1 profile access", "no profiles");

  section("Attendance");
  const { data: attSummaries } = await dev1Client.from("daily_attendance_summary").select("*").eq("profile_id", devUser.id);
  attSummaries.length > 0 ? pass(`dev1 sees own attendance (${attSummaries.length} records)`) : fail("dev1 attendance", "none");

  const { data: allAtt } = await adminClient.from("daily_attendance_summary").select("*");
  const testAtt = allAtt.filter((a) => testProfiles.some((p) => p.id === a.profile_id));
  testAtt.length > 0 ? pass(`admin sees test company attendance (${testAtt.length})`) : fail("admin attendance", "none");

  section("Leave");
  const { data: myLeave } = await dev1Client.from("leave_balances").select("*, leave_types(code)").eq("profile_id", devUser.id);
  myLeave.length > 0 ? pass(`dev1 sees own leave balance (${myLeave[0].leave_types?.code}: ${myLeave[0].remaining_days} remaining)`) : fail("leave balance", "none");

  section("Overtime");
  const { data: ot } = await dev1Client.from("overtime_requests").select("*").eq("profile_id", devUser.id);
  ot.length > 0 ? pass(`dev1 sees own OT (${ot.length} requests, ${ot[0].total_hours}h)`) : fail("OT", "none");

  section("Payroll");
  const { data: myPay } = await dev1Client.from("payroll_entries").select("gross_pay, net_pay").eq("profile_id", devUser.id);
  myPay.length > 0 ? pass(`dev1 sees own payslip (gross: ₱${myPay[0].gross_pay}, net: ₱${myPay[0].net_pay})`) : fail("payroll", "none");

  section("Workspace");
  const { data: tasks } = await dev1Client.from("workspace_tasks").select("name, priority").eq("assignee_id", devUser.id);
  tasks.length > 0 ? pass(`dev1 sees own tasks (${tasks.length}: ${tasks.map((t) => t.name).join(", ")})`) : fail("tasks", "none");

  section("Forms");
  const { data: formsList } = await adminClient.from("forms").select("id, name, is_public, public_token, status");
  const testForms = formsList.filter((f) => f.name === "Onboarding Survey");
  testForms.length === 1 ? pass(`admin sees test form (status: ${testForms[0].status}, public: ${testForms[0].is_public})`) : fail("forms", "not found");

  section("Timesheet");
  const { data: ts } = await dev1Client.from("timesheet_submissions").select("total_minutes, status").eq("profile_id", devUser.id);
  ts.length > 0 ? pass(`dev1 sees own timesheet (${ts[0].total_minutes / 60}hrs, ${ts[0].status})`) : fail("timesheet", "none");

  section("Dashboard");
  const { data: widgets } = await adminClient.from("dashboard_widgets").select("widget_type, size");
  widgets.length > 0 ? pass(`admin sees own widgets (${widgets.length} widgets)`) : fail("widgets", "none");

  section("RLS: dev1 cannot see payroll of other employees");
  const { data: otherPay } = await dev1Client.from("payroll_entries").select("profile_id").neq("profile_id", devUser.id);
  otherPay.length === 0 ? pass("RLS correctly blocks dev1 from others' payroll") : fail("RLS", `dev1 saw ${otherPay.length} other payroll entries — RLS broken`);

  section("Public form URL (HTTP)");
  const form = await admin.from("forms").select("public_token").eq("name", "Onboarding Survey").eq("company_id", "b1111111-1111-4111-8111-111111111111").single();
  if (form.data) {
    const url = `https://vizportal.vercel.app/forms/public/${form.data.public_token}`;
    const resp = await fetch(url);
    resp.ok ? pass(`public form URL returns 200 (${url})`) : fail("public form", `HTTP ${resp.status}`);
  }

  console.log(`\n=== SUMMARY ===`);
  console.log(`Passed: ${results.pass.length}`);
  console.log(`Failed: ${results.fail.length}`);
  if (results.fail.length > 0) {
    console.log("\nFailures:");
    for (const f of results.fail) console.log(`  - ${f.l}: ${f.e}`);
  }
}

main().catch((e) => { console.error("FATAL:", e); process.exit(1); });

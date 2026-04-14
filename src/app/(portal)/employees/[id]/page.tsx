import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PersonalInfoTab } from "@/components/employees/personal-info-tab";
import { EmploymentTab } from "@/components/employees/employment-tab";
import { DocumentsTab } from "@/components/employees/documents-tab";
import { EmployeeLeaveTab } from "@/components/leave/employee-leave-tab";
import { getEmployeeLeaveBalances } from "@/lib/actions/leave";
import { formatFullName } from "@/lib/utils/format";
import type { RoleName } from "@/types";

type Params = Promise<{ id: string }>;

export default async function EmployeeDetailPage({
  params,
}: {
  params: Params;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Get current user's roles
  const { data: currentUserRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("profile_id", user.id);
  const roles: RoleName[] = (currentUserRoles ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ur: any) => ur.roles.name
  );

  const isAdminOrHr = roles.includes("admin") || roles.includes("hr");
  const isSelf = user.id === id;

  // Fetch employee data
  const { data: employee } = await supabase
    .from("profiles")
    .select(`
      *,
      employee_details(*)
    `)
    .eq("id", id)
    .single();

  if (!employee || !employee.employee_details) notFound();

  const details = Array.isArray(employee.employee_details)
    ? employee.employee_details[0]
    : employee.employee_details;

  // Fetch documents
  const { data: documents } = await supabase
    .from("employee_documents")
    .select("*")
    .eq("profile_id", id)
    .order("created_at", { ascending: false });

  // Fetch departments and job levels for dropdowns
  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user.id)
    .single();

  const [{ data: departments }, { data: jobLevels }] = await Promise.all([
    supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", profile!.company_id)
      .order("name"),
    supabase
      .from("job_levels")
      .select("id, code, name")
      .eq("company_id", profile!.company_id)
      .order("rank"),
  ]);

  // Fetch leave balances (admin/HR only)
  const leaveBalances = isAdminOrHr
    ? await getEmployeeLeaveBalances(id)
    : [];

  return (
    <div className="mx-auto max-w-3xl">
      <h2 className="mb-6 text-xl font-semibold">
        {formatFullName(employee.first_name, employee.last_name)}
      </h2>

      <Tabs defaultValue="personal" className="space-y-4">
        <TabsList>
          <TabsTrigger value="personal">Personal Info</TabsTrigger>
          <TabsTrigger value="employment">Employment</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          {isAdminOrHr && <TabsTrigger value="leave">Leave</TabsTrigger>}
        </TabsList>

        <TabsContent value="personal">
          <PersonalInfoTab
            profileId={id}
            data={{
              first_name: employee.first_name,
              last_name: employee.last_name,
              email: employee.email,
              phone_number: details.phone_number,
              gender: details.gender,
              date_of_birth: details.date_of_birth,
              address_line: details.address_line,
              city: details.city,
              province: details.province,
              zip_code: details.zip_code,
              country: details.country,
              emergency_contact_name: details.emergency_contact_name,
              emergency_contact_phone: details.emergency_contact_phone,
              emergency_contact_relationship: details.emergency_contact_relationship,
            }}
            canEditAll={isAdminOrHr}
            isSelf={isSelf}
          />
        </TabsContent>

        <TabsContent value="employment">
          <EmploymentTab
            profileId={id}
            data={{
              department_id: details.department_id,
              job_level_id: details.job_level_id,
              job_position: details.job_position,
              weekly_required_hours: details.weekly_required_hours,
              salary: details.salary,
              salary_frequency: details.salary_frequency,
              date_hired: details.date_hired,
              date_regularized: details.date_regularized,
              employment_status: details.employment_status,
              tin_number: details.tin_number,
              sss_number: details.sss_number,
              philhealth_number: details.philhealth_number,
              pagibig_number: details.pagibig_number,
            }}
            firstName={employee.first_name}
            lastName={employee.last_name}
            departments={departments ?? []}
            jobLevels={jobLevels ?? []}
            canEdit={isAdminOrHr}
          />
        </TabsContent>

        <TabsContent value="documents">
          <DocumentsTab
            profileId={id}
            documents={documents ?? []}
            canUpload={isAdminOrHr || isSelf}
            canDelete={isAdminOrHr}
          />
        </TabsContent>

        {isAdminOrHr && (
          <TabsContent value="leave">
            {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
            <EmployeeLeaveTab
              profileId={id}
              balances={leaveBalances as any}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

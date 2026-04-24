import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchEmployeeAnalytics } from "@/lib/actions/analytics";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmployeeTable } from "@/components/employees/employee-table";
import { EmployeeAnalytics } from "@/components/employees/employee-analytics";
import { PersonalInfoTab } from "@/components/employees/personal-info-tab";
import { EmploymentTab } from "@/components/employees/employment-tab";
import { DocumentsTab } from "@/components/employees/documents-tab";
import { EMPLOYEES_PER_PAGE } from "@/lib/constants";
import { formatFullName } from "@/lib/utils/format";
import type { RoleName } from "@/types";

type SearchParams = Promise<{ [key: string]: string | undefined }>;

const ALL_MEMBERS_ROLES: RoleName[] = ["admin", "hr", "director", "business_manager"];

export default async function EmployeesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const search = params.search ?? "";
  const departmentId = params.department_id ?? "";
  const status = params.status ?? "";

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // Fetch current user roles
  const { data: currentUserRoles } = await supabase
    .from("user_roles")
    .select("roles(name)")
    .eq("profile_id", user.id);
  const roles: RoleName[] = (currentUserRoles ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (ur: any) => ur.roles.name
  );

  const canSeeAllMembers = roles.some((r) => ALL_MEMBERS_ROLES.includes(r));
  const defaultTab = canSeeAllMembers ? "all-members" : "my-profile";

  // Fetch current user's profile and details for My Profile tab
  const { data: myEmployee } = await supabase
    .from("profiles")
    .select(`
      *,
      employee_details(*)
    `)
    .eq("id", user.id)
    .single();

  const myDetails = myEmployee?.employee_details
    ? Array.isArray(myEmployee.employee_details)
      ? myEmployee.employee_details[0]
      : myEmployee.employee_details
    : null;

  // Fetch company_id for lookups
  const companyId = myEmployee?.company_id ?? null;

  const [departmentsResult, jobLevelsResult, documentsResult] =
    await Promise.all([
      companyId
        ? supabase
            .from("departments")
            .select("id, name")
            .eq("company_id", companyId)
            .order("name")
        : Promise.resolve({ data: [] }),
      companyId
        ? supabase
            .from("job_levels")
            .select("id, code, name")
            .eq("company_id", companyId)
            .order("rank")
        : Promise.resolve({ data: [] }),
      supabase
        .from("employee_documents")
        .select("*")
        .eq("profile_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

  const departments = departmentsResult.data ?? [];
  const jobLevels = jobLevelsResult.data ?? [];
  const myDocuments = documentsResult.data ?? [];

  // Fetch All Members data (only if user has permission)
  let employees: unknown[] = [];
  let totalCount = 0;

  if (canSeeAllMembers && companyId) {
    const from = (page - 1) * EMPLOYEES_PER_PAGE;
    const to = from + EMPLOYEES_PER_PAGE - 1;

    let query = supabase
      .from("profiles")
      .select(
        `
        id, first_name, last_name, email,
        employee_details!inner(
          job_position, employment_status, department_id,
          departments(name),
          job_levels(code, name)
        )
      `,
        { count: "exact" }
      )
      .eq("company_id", companyId)
      .eq("is_active", true)
      .range(from, to)
      .order("first_name");

    if (search) {
      query = query.or(
        `first_name.ilike.%${search}%,last_name.ilike.%${search}%,email.ilike.%${search}%`
      );
    }
    if (departmentId) {
      query = query.eq("employee_details.department_id", departmentId);
    }
    if (status) {
      query = query.eq(
        "employee_details.employment_status",
        status as
          | "probationary"
          | "regular"
          | "resigned"
          | "terminated"
      );
    }

    const { data: empData, count } = await query;
    employees = empData ?? [];
    totalCount = count ?? 0;
  }

  const analyticsData = canSeeAllMembers ? await fetchEmployeeAnalytics() : null;

  return (
    <div>
      <EmployeeAnalytics data={analyticsData} />
      <Tabs defaultValue={defaultTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="my-profile">My Profile</TabsTrigger>
          {canSeeAllMembers && (
            <TabsTrigger value="all-members">All Members</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="my-profile" className="animate-fade-in">
          {myEmployee && myDetails ? (
            <div className="mx-auto max-w-3xl space-y-4">
              <h2 className="text-xl font-semibold">
                {formatFullName(myEmployee.first_name, myEmployee.last_name)}
              </h2>
              <Tabs defaultValue="personal" className="space-y-4">
                <TabsList>
                  <TabsTrigger value="personal">Personal Info</TabsTrigger>
                  <TabsTrigger value="employment">Employment</TabsTrigger>
                  <TabsTrigger value="documents">Documents</TabsTrigger>
                </TabsList>

                <TabsContent value="personal" className="animate-fade-in">
                  <PersonalInfoTab
                    profileId={user.id}
                    data={{
                      first_name: myEmployee.first_name,
                      last_name: myEmployee.last_name,
                      email: myEmployee.email,
                      phone_number: myDetails.phone_number,
                      gender: myDetails.gender,
                      date_of_birth: myDetails.date_of_birth,
                      address_line: myDetails.address_line,
                      city: myDetails.city,
                      province: myDetails.province,
                      zip_code: myDetails.zip_code,
                      country: myDetails.country,
                      emergency_contact_name: myDetails.emergency_contact_name,
                      emergency_contact_phone: myDetails.emergency_contact_phone,
                      emergency_contact_relationship:
                        myDetails.emergency_contact_relationship,
                    }}
                    canEditAll={false}
                    isSelf={true}
                  />
                </TabsContent>

                <TabsContent value="employment" className="animate-fade-in">
                  <EmploymentTab
                    profileId={user.id}
                    data={{
                      department_id: myDetails.department_id,
                      job_level_id: myDetails.job_level_id,
                      job_position: myDetails.job_position,
                      weekly_required_hours: myDetails.weekly_required_hours,
                      salary: myDetails.salary,
                      salary_frequency: myDetails.salary_frequency,
                      date_hired: myDetails.date_hired,
                      date_regularized: myDetails.date_regularized,
                      employment_status: myDetails.employment_status,
                      tin_number: myDetails.tin_number,
                      sss_number: myDetails.sss_number,
                      philhealth_number: myDetails.philhealth_number,
                      pagibig_number: myDetails.pagibig_number,
                    }}
                    firstName={myEmployee.first_name}
                    lastName={myEmployee.last_name}
                    departments={departments}
                    jobLevels={jobLevels}
                    canEdit={false}
                  />
                </TabsContent>

                <TabsContent value="documents" className="animate-fade-in">
                  <DocumentsTab
                    profileId={user.id}
                    documents={myDocuments}
                    canUpload={true}
                    canDelete={false}
                  />
                </TabsContent>
              </Tabs>
            </div>
          ) : (
            <p className="text-muted-foreground">Profile not found.</p>
          )}
        </TabsContent>

        {canSeeAllMembers && (
          <TabsContent value="all-members" className="animate-fade-in">
            <EmployeeTable
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              employees={(employees as any) ?? []}
              totalCount={totalCount}
              page={page}
              departments={departments}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}

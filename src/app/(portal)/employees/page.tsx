import { createClient } from "@/lib/supabase/server";
import { EmployeeTable } from "@/components/employees/employee-table";
import { EMPLOYEES_PER_PAGE } from "@/lib/constants";

type SearchParams = Promise<{ [key: string]: string | undefined }>;

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

  const { data: profile } = await supabase
    .from("profiles")
    .select("company_id")
    .eq("id", user!.id)
    .single();

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
    .eq("company_id", profile!.company_id)
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
    query = query.eq("employee_details.employment_status", status as "probationary" | "regular" | "resigned" | "terminated");
  }

  const { data: employees, count } = await query;

  const { data: departments } = await supabase
    .from("departments")
    .select("id, name")
    .eq("company_id", profile!.company_id)
    .order("name");

  return (
    <div>
      <EmployeeTable
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        employees={(employees as any) ?? []}
        totalCount={count ?? 0}
        page={page}
        departments={departments ?? []}
      />
    </div>
  );
}

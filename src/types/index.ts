import type { Database } from "./database";

// Convenience aliases
export type Company = Database["public"]["Tables"]["companies"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Role = Database["public"]["Tables"]["roles"]["Row"];
export type UserRole = Database["public"]["Tables"]["user_roles"]["Row"];
export type Department = Database["public"]["Tables"]["departments"]["Row"];
export type JobLevel = Database["public"]["Tables"]["job_levels"]["Row"];
export type EmployeeDetail = Database["public"]["Tables"]["employee_details"]["Row"];
export type EmployeeDocument = Database["public"]["Tables"]["employee_documents"]["Row"];
export type Invitation = Database["public"]["Tables"]["invitations"]["Row"];

// Extended types for UI
export type ProfileWithRoles = Profile & {
  user_roles: (UserRole & { roles: Role })[];
};

export type EmployeeWithDetails = Profile & {
  employee_details: EmployeeDetail;
  user_roles: (UserRole & { roles: Role })[];
};

export type RoleName =
  | "admin"
  | "hr"
  | "director"
  | "business_manager"
  | "dept_manager"
  | "team_leader"
  | "member";

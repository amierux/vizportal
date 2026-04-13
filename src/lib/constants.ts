import type { RoleName } from "@/types";

export const ROLE_NAMES: Record<RoleName, string> = {
  admin: "Admin",
  hr: "HR",
  director: "Director",
  business_manager: "Business Manager",
  dept_manager: "Department Manager",
  team_leader: "Team Leader",
  member: "Member",
};

export const ROUTE_ROLE_MAP: Record<string, RoleName[]> = {
  "/company": ["admin", "hr"],
  "/employees": ["admin", "hr", "director", "business_manager", "dept_manager", "team_leader"],
  "/settings": ["admin"],
  "/settings/invitations": ["admin", "hr"],
  "/dashboard": [], // All authenticated users
  "/profile": [], // All authenticated users
};

export const EMPLOYMENT_STATUSES = [
  { value: "probationary", label: "Probationary" },
  { value: "regular", label: "Regular" },
  { value: "resigned", label: "Resigned" },
  { value: "terminated", label: "Terminated" },
] as const;

export const SALARY_FREQUENCIES = [
  { value: "monthly", label: "Monthly" },
  { value: "semi_monthly", label: "Semi-Monthly" },
  { value: "weekly", label: "Weekly" },
] as const;

export const GENDERS = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
] as const;

export const DOCUMENT_TYPES = [
  { value: "government_id", label: "Government ID" },
  { value: "contract", label: "Employment Contract" },
  { value: "nbi_clearance", label: "NBI Clearance" },
  { value: "resume", label: "Resume / CV" },
  { value: "diploma", label: "Diploma" },
  { value: "tor", label: "Transcript of Records" },
  { value: "certificate", label: "Certificate" },
  { value: "other", label: "Other" },
] as const;

export const MAX_FILE_SIZE_MB = 10;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;
export const ACCEPTED_FILE_TYPES = ["application/pdf", "image/jpeg", "image/png", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

export const INVITATION_EXPIRY_DAYS = 7;
export const EMPLOYEES_PER_PAGE = 25;

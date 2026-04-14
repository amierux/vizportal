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
  "/settings/company": ["admin", "hr"],
  "/employees": [], // All authenticated users
  "/settings": ["admin"],
  "/settings/invitations": ["admin", "hr"],
  "/dashboard": [], // All authenticated users
  "/profile": [], // All authenticated users
  "/attendance": [],
  "/attendance/team": ["dept_manager", "team_leader"],
  "/attendance/manage": ["admin", "hr"],
  "/attendance/reports": ["admin", "hr"],
  "/leave": [],
  "/leave/team": ["dept_manager", "team_leader"],
  "/leave/manage": ["admin", "hr"],
  "/leave/settings": ["admin"],
  "/approvals": [],
  "/settings/system": ["admin"],
  "/settings/employees": ["admin"],
  "/settings/approval": ["admin"],
  "/overtime": [],
  "/settings/attendance": ["admin"],
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

// Phase 2 — Attendance
export const ATTENDANCE_STATUSES = [
  { value: "present", label: "Present" },
  { value: "late", label: "Late" },
  { value: "absent", label: "Absent" },
  { value: "half_day", label: "Half Day" },
  { value: "on_leave", label: "On Leave" },
] as const;

export const WORK_TYPES = [
  { value: "full_time", label: "Full-Time" },
  { value: "part_time", label: "Part-Time" },
] as const;

export const WORK_DAYS = [
  { value: "mon", label: "Mon" },
  { value: "tue", label: "Tue" },
  { value: "wed", label: "Wed" },
  { value: "thu", label: "Thu" },
  { value: "fri", label: "Fri" },
  { value: "sat", label: "Sat" },
  { value: "sun", label: "Sun" },
] as const;

export const CLOCK_ENTRY_TYPES = [
  { value: "clock_in", label: "Clock In" },
  { value: "clock_out", label: "Clock Out" },
] as const;

export const SGT_TIMEZONE = "Asia/Singapore";
export const LATE_GRACE_MINUTES = 1;
export const CROSS_MIDNIGHT_THRESHOLD_HOURS = 4;
export const SELFIE_MAX_SIZE_KB = 100;
export const SELFIE_QUALITY = 0.4;
export const APPROVAL_REMINDER_DAYS = 3;

// Phase 2 — Leave
export const LEAVE_GENDER_OPTIONS = [
  { value: "all", label: "All" },
  { value: "male", label: "Male Only" },
  { value: "female", label: "Female Only" },
] as const;

export const LEAVE_REQUEST_STATUSES = [
  { value: "pending", label: "Pending" },
  { value: "approved", label: "Approved" },
  { value: "rejected", label: "Rejected" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const ATTENDANCE_PER_PAGE = 25;

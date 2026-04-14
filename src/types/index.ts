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
export type EmployeeSchedule = Database["public"]["Tables"]["employee_schedules"]["Row"];
export type ClockEntry = Database["public"]["Tables"]["clock_entries"]["Row"];
export type DailyAttendanceSummary = Database["public"]["Tables"]["daily_attendance_summary"]["Row"];
export type LeaveType = Database["public"]["Tables"]["leave_types"]["Row"];
export type LeaveSettings = Database["public"]["Tables"]["leave_settings"]["Row"];
export type LeaveBalance = Database["public"]["Tables"]["leave_balances"]["Row"];
export type LeaveRequest = Database["public"]["Tables"]["leave_requests"]["Row"];
export type ApprovalRequest = Database["public"]["Tables"]["approval_requests"]["Row"];
export type ApprovalStep = Database["public"]["Tables"]["approval_steps"]["Row"];
export type SystemSetting = Database["public"]["Tables"]["system_settings"]["Row"];
export type NonWorkingDay = Database["public"]["Tables"]["non_working_days"]["Row"];
export type OvertimeRequest = Database["public"]["Tables"]["overtime_requests"]["Row"];
export type ApprovalConfig = Database["public"]["Tables"]["approval_configs"]["Row"];
export type ApprovalConfigStep = Database["public"]["Tables"]["approval_config_steps"]["Row"];
export type LeaveRequestReliever = Database["public"]["Tables"]["leave_request_relievers"]["Row"];

export type ApprovalType = "manual_clock" | "leave_request";
export type AttendanceStatus = "present" | "late" | "absent" | "half_day" | "on_leave";
export type WorkType = "full_time" | "part_time";
export type LeaveRequestStatus = "pending" | "approved" | "rejected" | "cancelled";
export type ApprovalStepStatus = "pending" | "approved" | "rejected";

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

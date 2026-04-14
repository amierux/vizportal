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
export type PayrollSettings = Database["public"]["Tables"]["payroll_settings"]["Row"];
export type PayrollPeriod = Database["public"]["Tables"]["payroll_periods"]["Row"];
export type PayrollEntry = Database["public"]["Tables"]["payroll_entries"]["Row"];
export type PayrollCustomDeduction = Database["public"]["Tables"]["payroll_custom_deductions"]["Row"];
export type CustomDeductionType = Database["public"]["Tables"]["custom_deduction_types"]["Row"];
export type RecurringDeduction = Database["public"]["Tables"]["recurring_deductions"]["Row"];
export type PhContributionTable = Database["public"]["Tables"]["ph_contribution_tables"]["Row"];
export type PhTaxBracket = Database["public"]["Tables"]["ph_tax_brackets"]["Row"];
export type WorkspaceFolder = Database["public"]["Tables"]["workspace_folders"]["Row"];
export type WorkspaceFolderMember = Database["public"]["Tables"]["workspace_folder_members"]["Row"];
export type WorkspaceFolderStatus = Database["public"]["Tables"]["workspace_folder_statuses"]["Row"];
export type WorkspaceList = Database["public"]["Tables"]["workspace_lists"]["Row"];
export type WorkspaceListStatus = Database["public"]["Tables"]["workspace_list_statuses"]["Row"];
export type WorkspaceTask = Database["public"]["Tables"]["workspace_tasks"]["Row"];
export type WorkspaceTaskRemark = Database["public"]["Tables"]["workspace_task_remarks"]["Row"];
export type WorkspaceTaskAttachment = Database["public"]["Tables"]["workspace_task_attachments"]["Row"];
export type WorkspaceTaskChecklist = Database["public"]["Tables"]["workspace_task_checklists"]["Row"];
export type WorkspaceChecklistItem = Database["public"]["Tables"]["workspace_checklist_items"]["Row"];
export type WorkspaceChecklistTemplate = Database["public"]["Tables"]["workspace_checklist_templates"]["Row"];
export type WorkspaceListTemplate = Database["public"]["Tables"]["workspace_list_templates"]["Row"];
export type Notification = Database["public"]["Tables"]["notifications"]["Row"];
export type NotificationPreference = Database["public"]["Tables"]["notification_preferences"]["Row"];

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

// Placeholder — will be generated from Supabase after migrations run.
// For now, define the shape manually to unblock development.

export type Database = {
  public: {
    Tables: {
      companies: {
        Row: {
          id: string;
          name: string;
          logo_url: string | null;
          favicon_url: string | null;
          timezone: string;
          holiday_country: string;
          business_manager_id: string | null;
          director_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          favicon_url?: string | null;
          timezone?: string;
          holiday_country?: string;
          business_manager_id?: string | null;
          director_id?: string | null;
        };
        Update: {
          name?: string;
          logo_url?: string | null;
          favicon_url?: string | null;
          timezone?: string;
          holiday_country?: string;
          business_manager_id?: string | null;
          director_id?: string | null;
        };
        Relationships: [];
      };
      profiles: {
        Row: {
          id: string;
          company_id: string;
          email: string;
          first_name: string | null;
          last_name: string | null;
          avatar_url: string | null;
          is_active: boolean;
          profile_completed: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          company_id: string;
          email: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          profile_completed?: boolean;
        };
        Update: {
          company_id?: string;
          email?: string;
          first_name?: string | null;
          last_name?: string | null;
          avatar_url?: string | null;
          is_active?: boolean;
          profile_completed?: boolean;
        };
        Relationships: [];
      };
      roles: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          description: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          description?: string | null;
        };
        Update: {
          name?: string;
          description?: string | null;
        };
        Relationships: [];
      };
      user_roles: {
        Row: {
          id: string;
          profile_id: string;
          role_id: string;
          assigned_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          role_id: string;
        };
        Update: {
          profile_id?: string;
          role_id?: string;
        };
        Relationships: [];
      };
      departments: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          manager_id: string | null;
          team_leader_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          manager_id?: string | null;
          team_leader_id?: string | null;
        };
        Update: {
          name?: string;
          manager_id?: string | null;
          team_leader_id?: string | null;
        };
        Relationships: [];
      };
      job_levels: {
        Row: {
          id: string;
          company_id: string;
          code: string;
          name: string;
          rank: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          code: string;
          name: string;
          rank: number;
        };
        Update: {
          code?: string;
          name?: string;
          rank?: number;
        };
        Relationships: [];
      };
      employee_details: {
        Row: {
          id: string;
          profile_id: string;
          company_id: string;
          department_id: string | null;
          job_level_id: string | null;
          job_position: string | null;
          gender: "male" | "female" | null;
          date_of_birth: string | null;
          phone_number: string | null;
          address_line: string | null;
          city: string | null;
          province: string | null;
          zip_code: string | null;
          country: string | null;
          tin_number: string | null;
          sss_number: string | null;
          philhealth_number: string | null;
          pagibig_number: string | null;
          emergency_contact_name: string | null;
          emergency_contact_phone: string | null;
          emergency_contact_relationship: string | null;
          weekly_required_hours: number;
          salary: number | null;
          salary_frequency: "monthly" | "semi_monthly" | "weekly" | null;
          date_hired: string | null;
          date_regularized: string | null;
          employment_status: "probationary" | "regular" | "resigned" | "terminated";
          bank_name: string | null;
          bank_account_number: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          company_id: string;
          department_id?: string | null;
          job_level_id?: string | null;
          job_position?: string | null;
          gender?: "male" | "female" | null;
          date_of_birth?: string | null;
          phone_number?: string | null;
          address_line?: string | null;
          city?: string | null;
          province?: string | null;
          zip_code?: string | null;
          country?: string | null;
          tin_number?: string | null;
          sss_number?: string | null;
          philhealth_number?: string | null;
          pagibig_number?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relationship?: string | null;
          weekly_required_hours?: number;
          salary?: number | null;
          salary_frequency?: "monthly" | "semi_monthly" | "weekly" | null;
          date_hired?: string | null;
          date_regularized?: string | null;
          employment_status?: "probationary" | "regular" | "resigned" | "terminated";
          bank_name?: string | null;
          bank_account_number?: string | null;
        };
        Update: {
          department_id?: string | null;
          job_level_id?: string | null;
          job_position?: string | null;
          gender?: "male" | "female" | null;
          date_of_birth?: string | null;
          phone_number?: string | null;
          address_line?: string | null;
          city?: string | null;
          province?: string | null;
          zip_code?: string | null;
          country?: string | null;
          tin_number?: string | null;
          sss_number?: string | null;
          philhealth_number?: string | null;
          pagibig_number?: string | null;
          emergency_contact_name?: string | null;
          emergency_contact_phone?: string | null;
          emergency_contact_relationship?: string | null;
          weekly_required_hours?: number;
          salary?: number | null;
          salary_frequency?: "monthly" | "semi_monthly" | "weekly" | null;
          date_hired?: string | null;
          date_regularized?: string | null;
          employment_status?: "probationary" | "regular" | "resigned" | "terminated";
          bank_name?: string | null;
          bank_account_number?: string | null;
        };
        Relationships: [];
      };
      employee_documents: {
        Row: {
          id: string;
          profile_id: string;
          company_id: string;
          document_type: string;
          file_name: string;
          file_url: string;
          uploaded_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          company_id: string;
          document_type: string;
          file_name: string;
          file_url: string;
          uploaded_by: string;
        };
        Update: {
          document_type?: string;
          file_name?: string;
          file_url?: string;
        };
        Relationships: [];
      };
      invitations: {
        Row: {
          id: string;
          company_id: string;
          email: string;
          department_id: string | null;
          job_level_id: string | null;
          job_position: string | null;
          role_ids: string[];
          invited_by: string;
          status: "pending" | "accepted" | "expired";
          expires_at: string;
          created_at: string;
          accepted_at: string | null;
        };
        Insert: {
          id?: string;
          company_id: string;
          email: string;
          department_id?: string | null;
          job_level_id?: string | null;
          job_position?: string | null;
          role_ids: string[];
          invited_by: string;
          status?: "pending" | "accepted" | "expired";
          expires_at: string;
        };
        Update: {
          status?: "pending" | "accepted" | "expired";
          expires_at?: string;
          accepted_at?: string | null;
        };
        Relationships: [];
      };
      employee_schedules: {
        Row: {
          id: string;
          profile_id: string;
          company_id: string;
          work_type: "full_time" | "part_time";
          start_time: string;
          end_time: string;
          work_days: string[];
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          company_id: string;
          work_type: "full_time" | "part_time";
          start_time: string;
          end_time: string;
          work_days: string[];
          timezone?: string;
        };
        Update: {
          work_type?: "full_time" | "part_time";
          start_time?: string;
          end_time?: string;
          work_days?: string[];
          timezone?: string;
        };
        Relationships: [];
      };
      clock_entries: {
        Row: {
          id: string;
          company_id: string;
          profile_id: string;
          type: "clock_in" | "clock_out";
          timestamp: string;
          selfie_url: string | null;
          latitude: number | null;
          longitude: number | null;
          is_manual: boolean;
          manual_remarks: string | null;
          attachment_url: string | null;
          date: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          profile_id: string;
          type: "clock_in" | "clock_out";
          timestamp: string;
          selfie_url?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          is_manual?: boolean;
          manual_remarks?: string | null;
          attachment_url?: string | null;
          date: string;
        };
        Update: {
          is_manual?: boolean;
          manual_remarks?: string | null;
          attachment_url?: string | null;
        };
        Relationships: [];
      };
      daily_attendance_summary: {
        Row: {
          id: string;
          profile_id: string;
          company_id: string;
          date: string;
          total_hours: number;
          required_hours: number;
          is_late: boolean;
          late_minutes: number;
          is_early_out: boolean;
          early_out_minutes: number;
          is_undertime: boolean;
          undertime_minutes: number;
          overtime_minutes: number;
          has_missing_entry: boolean;
          status: "present" | "late" | "absent" | "half_day" | "on_leave";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          company_id: string;
          date: string;
          total_hours?: number;
          required_hours: number;
          is_late?: boolean;
          late_minutes?: number;
          is_early_out?: boolean;
          early_out_minutes?: number;
          is_undertime?: boolean;
          undertime_minutes?: number;
          overtime_minutes?: number;
          has_missing_entry?: boolean;
          status?: "present" | "late" | "absent" | "half_day" | "on_leave";
        };
        Update: {
          total_hours?: number;
          required_hours?: number;
          is_late?: boolean;
          late_minutes?: number;
          is_early_out?: boolean;
          early_out_minutes?: number;
          is_undertime?: boolean;
          undertime_minutes?: number;
          overtime_minutes?: number;
          has_missing_entry?: boolean;
          status?: "present" | "late" | "absent" | "half_day" | "on_leave";
        };
        Relationships: [];
      };
      leave_types: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          code: string;
          default_days: number;
          is_paid: boolean;
          applicable_gender: "all" | "male" | "female";
          requires_attachment: boolean;
          is_carry_over: boolean;
          max_carry_over_days: number;
          is_active: boolean;
          requires_reliever: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          code: string;
          default_days: number;
          is_paid?: boolean;
          applicable_gender?: "all" | "male" | "female";
          requires_attachment?: boolean;
          is_carry_over?: boolean;
          max_carry_over_days?: number;
          is_active?: boolean;
          requires_reliever?: boolean;
        };
        Update: {
          name?: string;
          code?: string;
          default_days?: number;
          is_paid?: boolean;
          applicable_gender?: "all" | "male" | "female";
          requires_attachment?: boolean;
          is_carry_over?: boolean;
          max_carry_over_days?: number;
          is_active?: boolean;
          requires_reliever?: boolean;
        };
        Relationships: [];
      };
      leave_settings: {
        Row: {
          id: string;
          company_id: string;
          reset_month: number;
          reset_day: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          reset_month?: number;
          reset_day?: number;
        };
        Update: {
          reset_month?: number;
          reset_day?: number;
        };
        Relationships: [];
      };
      leave_balances: {
        Row: {
          id: string;
          profile_id: string;
          company_id: string;
          leave_type_id: string;
          year: number;
          total_days: number;
          used_days: number;
          remaining_days: number;
          carried_over_days: number;
          is_disabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          company_id: string;
          leave_type_id: string;
          year: number;
          total_days: number;
          used_days?: number;
          remaining_days: number;
          carried_over_days?: number;
          is_disabled?: boolean;
        };
        Update: {
          total_days?: number;
          used_days?: number;
          remaining_days?: number;
          carried_over_days?: number;
          is_disabled?: boolean;
        };
        Relationships: [];
      };
      leave_requests: {
        Row: {
          id: string;
          company_id: string;
          profile_id: string;
          leave_type_id: string;
          start_date: string;
          end_date: string;
          total_days: number;
          reason: string | null;
          attachment_url: string | null;
          status: "pending" | "approved" | "rejected" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          profile_id: string;
          leave_type_id: string;
          start_date: string;
          end_date: string;
          total_days: number;
          reason?: string | null;
          attachment_url?: string | null;
          status?: "pending" | "approved" | "rejected" | "cancelled";
        };
        Update: {
          status?: "pending" | "approved" | "rejected" | "cancelled";
          reason?: string | null;
          attachment_url?: string | null;
        };
        Relationships: [];
      };
      approval_requests: {
        Row: {
          id: string;
          company_id: string;
          type: string;
          reference_id: string;
          requester_id: string;
          status: "pending" | "approved" | "rejected" | "cancelled";
          current_step: number;
          total_steps: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          type: string;
          reference_id: string;
          requester_id: string;
          status?: "pending" | "approved" | "rejected" | "cancelled";
          current_step?: number;
          total_steps: number;
        };
        Update: {
          status?: "pending" | "approved" | "rejected" | "cancelled";
          current_step?: number;
        };
        Relationships: [];
      };
      approval_steps: {
        Row: {
          id: string;
          approval_request_id: string;
          step_order: number;
          approver_id: string;
          status: "pending" | "approved" | "rejected";
          comment: string | null;
          decided_at: string | null;
          email_sent_at: string | null;
          reminder_sent_at: string | null;
          token: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          approval_request_id: string;
          step_order: number;
          approver_id: string;
          status?: "pending" | "approved" | "rejected";
          comment?: string | null;
          token?: string;
        };
        Update: {
          status?: "pending" | "approved" | "rejected";
          comment?: string | null;
          decided_at?: string | null;
          email_sent_at?: string | null;
          reminder_sent_at?: string | null;
        };
        Relationships: [];
      };
      system_settings: {
        Row: {
          id: string;
          company_id: string;
          key: string;
          value: string;
          is_secret: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          key: string;
          value: string;
          is_secret?: boolean;
        };
        Update: {
          value?: string;
          is_secret?: boolean;
        };
        Relationships: [];
      };
      non_working_days: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          date: string;
          is_recurring: boolean;
          country: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          date: string;
          is_recurring?: boolean;
          country?: string;
        };
        Update: {
          name?: string;
          date?: string;
          is_recurring?: boolean;
          country?: string;
        };
        Relationships: [];
      };
      overtime_requests: {
        Row: {
          id: string;
          company_id: string;
          profile_id: string;
          date: string;
          start_time: string;
          end_time: string;
          total_hours: number;
          reason: string;
          attachment_url: string | null;
          status: "pending" | "approved" | "rejected" | "cancelled";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          profile_id: string;
          date: string;
          start_time: string;
          end_time: string;
          total_hours: number;
          reason: string;
          attachment_url?: string | null;
          status?: "pending" | "approved" | "rejected" | "cancelled";
        };
        Update: {
          status?: "pending" | "approved" | "rejected" | "cancelled";
          attachment_url?: string | null;
        };
        Relationships: [];
      };
      approval_configs: {
        Row: {
          id: string;
          company_id: string;
          type: string;
          is_enabled: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          type: string;
          is_enabled?: boolean;
        };
        Update: {
          is_enabled?: boolean;
        };
        Relationships: [];
      };
      approval_config_steps: {
        Row: {
          id: string;
          approval_config_id: string;
          step_order: number;
          role: string;
          is_optional: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          approval_config_id: string;
          step_order: number;
          role: string;
          is_optional?: boolean;
        };
        Update: {
          step_order?: number;
          role?: string;
          is_optional?: boolean;
        };
        Relationships: [];
      };
      leave_request_relievers: {
        Row: {
          id: string;
          leave_request_id: string;
          reliever_id: string;
          tasks: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          leave_request_id: string;
          reliever_id: string;
          tasks: string;
        };
        Update: {
          tasks?: string;
        };
        Relationships: [];
      };
      payroll_settings: {
        Row: {
          id: string;
          company_id: string;
          schedule_type: "monthly" | "semi_monthly" | "weekly";
          pay_day_1: number;
          pay_day_2: number | null;
          cutoff_days_before: number;
          is_enabled: boolean;
          enable_late_deduction: boolean;
          enable_undertime_deduction: boolean;
          enable_absent_deduction: boolean;
          ot_regular_multiplier: number;
          ot_rest_day_multiplier: number;
          ot_holiday_multiplier: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          schedule_type?: "monthly" | "semi_monthly" | "weekly";
          pay_day_1?: number;
          pay_day_2?: number | null;
          cutoff_days_before?: number;
          is_enabled?: boolean;
          enable_late_deduction?: boolean;
          enable_undertime_deduction?: boolean;
          enable_absent_deduction?: boolean;
          ot_regular_multiplier?: number;
          ot_rest_day_multiplier?: number;
          ot_holiday_multiplier?: number;
        };
        Update: {
          schedule_type?: "monthly" | "semi_monthly" | "weekly";
          pay_day_1?: number;
          pay_day_2?: number | null;
          cutoff_days_before?: number;
          is_enabled?: boolean;
          enable_late_deduction?: boolean;
          enable_undertime_deduction?: boolean;
          enable_absent_deduction?: boolean;
          ot_regular_multiplier?: number;
          ot_rest_day_multiplier?: number;
          ot_holiday_multiplier?: number;
        };
        Relationships: [];
      };
      payroll_periods: {
        Row: {
          id: string;
          company_id: string;
          start_date: string;
          end_date: string;
          pay_date: string;
          status: "draft" | "processing" | "completed" | "cancelled";
          processed_by: string | null;
          processed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          start_date: string;
          end_date: string;
          pay_date: string;
          status?: "draft" | "processing" | "completed" | "cancelled";
          processed_by?: string | null;
          processed_at?: string | null;
        };
        Update: {
          start_date?: string;
          end_date?: string;
          pay_date?: string;
          status?: "draft" | "processing" | "completed" | "cancelled";
          processed_by?: string | null;
          processed_at?: string | null;
        };
        Relationships: [];
      };
      payroll_entries: {
        Row: {
          id: string;
          payroll_period_id: string;
          profile_id: string;
          company_id: string;
          basic_salary: number;
          daily_rate: number;
          hourly_rate: number;
          days_worked: number;
          days_absent: number;
          days_late: number;
          late_minutes_total: number;
          undertime_minutes_total: number;
          ot_regular_hours: number;
          ot_rest_day_hours: number;
          ot_holiday_hours: number;
          paid_leave_days: number;
          unpaid_leave_days: number;
          holiday_pay_days: number;
          basic_pay: number;
          ot_pay: number;
          holiday_pay: number;
          late_deduction: number;
          undertime_deduction: number;
          absent_deduction: number;
          unpaid_leave_deduction: number;
          gross_pay: number;
          sss_contribution: number;
          philhealth_contribution: number;
          pagibig_contribution: number;
          withholding_tax: number;
          custom_deductions_total: number;
          total_deductions: number;
          net_pay: number;
          bank_credited: boolean;
          bank_credited_at: string | null;
          bank_credited_by: string | null;
          status: "draft" | "finalized";
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          payroll_period_id: string;
          profile_id: string;
          company_id: string;
          basic_salary: number;
          daily_rate: number;
          hourly_rate: number;
          days_worked?: number;
          days_absent?: number;
          days_late?: number;
          late_minutes_total?: number;
          undertime_minutes_total?: number;
          ot_regular_hours?: number;
          ot_rest_day_hours?: number;
          ot_holiday_hours?: number;
          paid_leave_days?: number;
          unpaid_leave_days?: number;
          holiday_pay_days?: number;
          basic_pay: number;
          ot_pay?: number;
          holiday_pay?: number;
          late_deduction?: number;
          undertime_deduction?: number;
          absent_deduction?: number;
          unpaid_leave_deduction?: number;
          gross_pay: number;
          sss_contribution?: number;
          philhealth_contribution?: number;
          pagibig_contribution?: number;
          withholding_tax?: number;
          custom_deductions_total?: number;
          total_deductions: number;
          net_pay: number;
          bank_credited?: boolean;
          bank_credited_at?: string | null;
          bank_credited_by?: string | null;
          status?: "draft" | "finalized";
        };
        Update: {
          days_worked?: number;
          days_absent?: number;
          days_late?: number;
          late_minutes_total?: number;
          undertime_minutes_total?: number;
          ot_regular_hours?: number;
          ot_rest_day_hours?: number;
          ot_holiday_hours?: number;
          paid_leave_days?: number;
          unpaid_leave_days?: number;
          holiday_pay_days?: number;
          basic_pay?: number;
          ot_pay?: number;
          holiday_pay?: number;
          late_deduction?: number;
          undertime_deduction?: number;
          absent_deduction?: number;
          unpaid_leave_deduction?: number;
          gross_pay?: number;
          sss_contribution?: number;
          philhealth_contribution?: number;
          pagibig_contribution?: number;
          withholding_tax?: number;
          custom_deductions_total?: number;
          total_deductions?: number;
          net_pay?: number;
          bank_credited?: boolean;
          bank_credited_at?: string | null;
          bank_credited_by?: string | null;
          status?: "draft" | "finalized";
        };
        Relationships: [];
      };
      payroll_custom_deductions: {
        Row: {
          id: string;
          payroll_entry_id: string;
          name: string;
          type: "deduction" | "adjustment";
          amount: number;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          payroll_entry_id: string;
          name: string;
          type: "deduction" | "adjustment";
          amount: number;
          notes?: string | null;
        };
        Update: {
          name?: string;
          type?: "deduction" | "adjustment";
          amount?: number;
          notes?: string | null;
        };
        Relationships: [];
      };
      custom_deduction_types: {
        Row: {
          id: string;
          company_id: string;
          name: string;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          company_id: string;
          name: string;
          is_active?: boolean;
        };
        Update: {
          name?: string;
          is_active?: boolean;
        };
        Relationships: [];
      };
      recurring_deductions: {
        Row: {
          id: string;
          profile_id: string;
          company_id: string;
          custom_deduction_type_id: string;
          amount: number;
          start_date: string;
          end_date: string | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          profile_id: string;
          company_id: string;
          custom_deduction_type_id: string;
          amount: number;
          start_date: string;
          end_date?: string | null;
          is_active?: boolean;
        };
        Update: {
          amount?: number;
          start_date?: string;
          end_date?: string | null;
          is_active?: boolean;
        };
        Relationships: [];
      };
      ph_contribution_tables: {
        Row: {
          id: string;
          type: "sss" | "philhealth" | "pagibig";
          salary_from: number;
          salary_to: number;
          employee_share: number;
          employer_share: number;
          effective_year: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          type: "sss" | "philhealth" | "pagibig";
          salary_from: number;
          salary_to: number;
          employee_share: number;
          employer_share: number;
          effective_year: number;
        };
        Update: {
          type?: "sss" | "philhealth" | "pagibig";
          salary_from?: number;
          salary_to?: number;
          employee_share?: number;
          employer_share?: number;
          effective_year?: number;
        };
        Relationships: [];
      };
      ph_tax_brackets: {
        Row: {
          id: string;
          compensation_from: number;
          compensation_to: number;
          tax_rate: number;
          base_tax: number;
          frequency: "monthly" | "semi_monthly" | "weekly";
          effective_year: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          compensation_from: number;
          compensation_to: number;
          tax_rate: number;
          base_tax: number;
          frequency: "monthly" | "semi_monthly" | "weekly";
          effective_year: number;
        };
        Update: {
          compensation_from?: number;
          compensation_to?: number;
          tax_rate?: number;
          base_tax?: number;
          frequency?: "monthly" | "semi_monthly" | "weekly";
          effective_year?: number;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      get_user_company_id: {
        Args: Record<string, never>;
        Returns: string;
      };
      has_role: {
        Args: { role_name: string };
        Returns: boolean;
      };
    };
  };
};

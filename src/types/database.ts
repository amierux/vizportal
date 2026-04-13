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
          business_manager_id: string | null;
          director_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          logo_url?: string | null;
          business_manager_id?: string | null;
          director_id?: string | null;
        };
        Update: {
          name?: string;
          logo_url?: string | null;
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
    };
    Views: {};
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

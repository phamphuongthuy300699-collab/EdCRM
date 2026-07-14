export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          city: string;
          timezone: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          city?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          city?: string;
          timezone?: string;
          created_at?: string;
          updated_at?: string;
        };
      };
      profiles: {
        Row: {
          id: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      org_memberships: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'manager' | 'teacher' | 'accountant';
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'manager' | 'teacher' | 'accountant';
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'manager' | 'teacher' | 'accountant';
          is_active?: boolean;
          created_at?: string;
        };
      };
      branches: {
        Row: {
          id: string;
          organization_id: string;
          name: string;
          address: string | null;
          phone: string | null;
          is_active: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          name: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          name?: string;
          address?: string | null;
          phone?: string | null;
          is_active?: boolean;
          created_at?: string;
        };
      };
      rooms: {
        Row: {
          id: string;
          organization_id: string;
          branch_id: string | null;
          name: string;
          capacity: number | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          branch_id?: string | null;
          name: string;
          capacity?: number | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          branch_id?: string | null;
          name?: string;
          capacity?: number | null;
          created_at?: string;
        };
      };
      courses: {
        Row: {
          id: string;
          organization_id: string;
          title: string;
          slug: string;
          short_description: string | null;
          full_description: string | null;
          min_age: number | null;
          max_age: number | null;
          duration_minutes: number;
          price_monthly: number | null;
          is_public: boolean;
          sort_order: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          title: string;
          slug: string;
          short_description?: string | null;
          full_description?: string | null;
          min_age?: number | null;
          max_age?: number | null;
          duration_minutes?: number;
          price_monthly?: number | null;
          is_public?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          title?: string;
          slug?: string;
          short_description?: string | null;
          full_description?: string | null;
          min_age?: number | null;
          max_age?: number | null;
          duration_minutes?: number;
          price_monthly?: number | null;
          is_public?: boolean;
          sort_order?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      groups: {
        Row: {
          id: string;
          organization_id: string;
          course_id: string;
          branch_id: string | null;
          room_id: string | null;
          teacher_id: string | null;
          title: string;
          status: 'draft' | 'active' | 'paused' | 'closed';
          age_from: number | null;
          age_to: number | null;
          capacity: number;
          starts_on: string | null;
          ends_on: string | null;
          price_monthly: number | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          course_id: string;
          branch_id?: string | null;
          room_id?: string | null;
          teacher_id?: string | null;
          title: string;
          status?: 'draft' | 'active' | 'paused' | 'closed';
          age_from?: number | null;
          age_to?: number | null;
          capacity?: number;
          starts_on?: string | null;
          ends_on?: string | null;
          price_monthly?: number | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          course_id?: string;
          branch_id?: string | null;
          room_id?: string | null;
          teacher_id?: string | null;
          title?: string;
          status?: 'draft' | 'active' | 'paused' | 'closed';
          age_from?: number | null;
          age_to?: number | null;
          capacity?: number;
          starts_on?: string | null;
          ends_on?: string | null;
          price_monthly?: number | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      leads: {
        Row: {
          id: string;
          organization_id: string;
          status: 'new' | 'contacted' | 'trial_scheduled' | 'converted' | 'lost';
          source: string;
          parent_name: string;
          parent_phone: string;
          parent_email: string | null;
          child_name: string | null;
          child_age: number | null;
          course_id: string | null;
          message: string | null;
          assigned_to: string | null;
          converted_student_id: string | null;
          converted_guardian_id: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          status?: 'new' | 'contacted' | 'trial_scheduled' | 'converted' | 'lost';
          source?: string;
          parent_name: string;
          parent_phone: string;
          parent_email?: string | null;
          child_name?: string | null;
          child_age?: number | null;
          course_id?: string | null;
          message?: string | null;
          assigned_to?: string | null;
          converted_student_id?: string | null;
          converted_guardian_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          status?: 'new' | 'contacted' | 'trial_scheduled' | 'converted' | 'lost';
          source?: string;
          parent_name?: string;
          parent_phone?: string;
          parent_email?: string | null;
          child_name?: string | null;
          child_age?: number | null;
          course_id?: string | null;
          message?: string | null;
          assigned_to?: string | null;
          converted_student_id?: string | null;
          converted_guardian_id?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      students: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string;
          birth_date: string | null;
          status: 'active' | 'paused' | 'archived';
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          full_name: string;
          birth_date?: string | null;
          status?: 'active' | 'paused' | 'archived';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          full_name?: string;
          birth_date?: string | null;
          status?: 'active' | 'paused' | 'archived';
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      guardians: {
        Row: {
          id: string;
          organization_id: string;
          full_name: string;
          phone: string | null;
          phone_normalized: string | null;
          email: string | null;
          email_normalized: string | null;
          telegram_username: string | null;
          max_contact: string | null;
          status: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          full_name: string;
          phone?: string | null;
          phone_normalized?: string | null;
          email?: string | null;
          email_normalized?: string | null;
          telegram_username?: string | null;
          max_contact?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          full_name?: string;
          phone?: string | null;
          phone_normalized?: string | null;
          email?: string | null;
          email_normalized?: string | null;
          telegram_username?: string | null;
          max_contact?: string | null;
          status?: string;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      student_guardians: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string;
          guardian_id: string;
          relation: string | null;
          is_primary: boolean;
          is_billing_contact: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id: string;
          guardian_id: string;
          relation?: string | null;
          is_primary?: boolean;
          is_billing_contact?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          student_id?: string;
          guardian_id?: string;
          relation?: string | null;
          is_primary?: boolean;
          is_billing_contact?: boolean;
          created_at?: string;
        };
      };
      enrollments: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string;
          group_id: string;
          status: 'active' | 'paused' | 'completed' | 'cancelled';
          started_on: string;
          ended_on: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id: string;
          group_id: string;
          status?: 'active' | 'paused' | 'completed' | 'cancelled';
          started_on?: string;
          ended_on?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          student_id?: string;
          group_id?: string;
          status?: 'active' | 'paused' | 'completed' | 'cancelled';
          started_on?: string;
          ended_on?: string | null;
          created_at?: string;
        };
      };
      invoices: {
        Row: {
          id: string;
          organization_id: string;
          student_id: string | null;
          guardian_id: string | null;
          enrollment_id: string | null;
          number: string;
          status: 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
          title: string;
          description: string | null;
          amount: number;
          currency: string;
          period_start: string | null;
          period_end: string | null;
          due_date: string | null;
          issued_at: string | null;
          paid_at: string | null;
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          student_id?: string | null;
          guardian_id?: string | null;
          enrollment_id?: string | null;
          number?: string;
          status?: 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
          title: string;
          description?: string | null;
          amount: number;
          currency?: string;
          period_start?: string | null;
          period_end?: string | null;
          due_date?: string | null;
          issued_at?: string | null;
          paid_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          student_id?: string | null;
          guardian_id?: string | null;
          enrollment_id?: string | null;
          number?: string;
          status?: 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
          title?: string;
          description?: string | null;
          amount?: number;
          currency?: string;
          period_start?: string | null;
          period_end?: string | null;
          due_date?: string | null;
          issued_at?: string | null;
          paid_at?: string | null;
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      payments: {
        Row: {
          id: string;
          organization_id: string;
          invoice_id: string | null;
          student_id: string | null;
          guardian_id: string | null;
          provider: 'cash' | 'bank_transfer' | 'yookassa' | 'robokassa' | 'manual' | 'alfabank';
          status: 'pending' | 'redirected' | 'authorized' | 'paid' | 'succeeded' | 'failed' | 'refunded' | 'cancelled' | 'unknown';
          amount: number;
          currency: string;
          provider_order_id: string | null;
          provider_payment_id: string | null;
          payment_url: string | null;
          external_status: string | null;
          paid_at: string | null;
          failed_at: string | null;
          raw_request: Json | null;
          raw_response: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          invoice_id?: string | null;
          student_id?: string | null;
          guardian_id?: string | null;
          provider: 'cash' | 'bank_transfer' | 'yookassa' | 'robokassa' | 'manual' | 'alfabank';
          status?: 'pending' | 'redirected' | 'authorized' | 'paid' | 'succeeded' | 'failed' | 'refunded' | 'cancelled' | 'unknown';
          amount: number;
          currency?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          payment_url?: string | null;
          external_status?: string | null;
          paid_at?: string | null;
          failed_at?: string | null;
          raw_request?: Json | null;
          raw_response?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          invoice_id?: string | null;
          student_id?: string | null;
          guardian_id?: string | null;
          provider?: 'cash' | 'bank_transfer' | 'yookassa' | 'robokassa' | 'manual' | 'alfabank';
          status?: 'pending' | 'redirected' | 'authorized' | 'paid' | 'succeeded' | 'failed' | 'refunded' | 'cancelled' | 'unknown';
          amount?: number;
          currency?: string;
          provider_order_id?: string | null;
          provider_payment_id?: string | null;
          payment_url?: string | null;
          external_status?: string | null;
          paid_at?: string | null;
          failed_at?: string | null;
          raw_request?: Json | null;
          raw_response?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      payment_events: {
        Row: {
          id: string;
          organization_id: string;
          payment_id: string | null;
          invoice_id: string | null;
          provider: 'manual' | 'alfabank';
          event_type: string;
          payload: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          payment_id?: string | null;
          invoice_id?: string | null;
          provider: 'manual' | 'alfabank';
          event_type: string;
          payload?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          payment_id?: string | null;
          invoice_id?: string | null;
          provider?: 'manual' | 'alfabank';
          event_type?: string;
          payload?: Json;
          created_at?: string;
        };
      };
      payment_transactions: {
        Row: {
          id: string;
          organization_id: string;
          payment_id: string | null;
          provider: 'cash' | 'bank_transfer' | 'yookassa' | 'robokassa' | 'manual' | 'alfabank';
          event_type: string;
          external_id: string | null;
          payload: Json;
          received_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          payment_id?: string | null;
          provider: 'cash' | 'bank_transfer' | 'yookassa' | 'robokassa' | 'manual' | 'alfabank';
          event_type: string;
          external_id?: string | null;
          payload: Json;
          received_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          payment_id?: string | null;
          provider?: 'cash' | 'bank_transfer' | 'yookassa' | 'robokassa' | 'manual' | 'alfabank';
          event_type?: string;
          external_id?: string | null;
          payload?: Json;
          received_at?: string;
        };
      };
      attendance: {
        Row: {
          id: string;
          organization_id: string;
          group_id: string;
          student_id: string;
          lesson_date: string;
          is_present: boolean;
          comment: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          group_id: string;
          student_id: string;
          lesson_date: string;
          is_present?: boolean;
          comment?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          group_id?: string;
          student_id?: string;
          lesson_date?: string;
          is_present?: boolean;
          comment?: string | null;
          created_at?: string;
        };
      };
      audit_log: {
        Row: {
          id: string;
          organization_id: string | null;
          actor_user_id: string | null;
          entity_type: string;
          entity_id: string | null;
          action: string;
          before: Json | null;
          after: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          organization_id?: string | null;
          actor_user_id?: string | null;
          entity_type: string;
          entity_id?: string | null;
          action: string;
          before?: Json | null;
          after?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string | null;
          actor_user_id?: string | null;
          entity_type?: string;
          entity_id?: string | null;
          action?: string;
          before?: Json | null;
          after?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      is_org_member: {
        Args: {
          target_org_id: string;
        };
        Returns: boolean;
      };
      has_org_role: {
        Args: {
          target_org_id: string;
          allowed_roles: ('owner' | 'admin' | 'manager' | 'teacher' | 'accountant')[];
        };
        Returns: boolean;
      };
    };
    Enums: {
      app_role: 'owner' | 'admin' | 'manager' | 'teacher' | 'accountant';
      lead_status: 'new' | 'contacted' | 'trial_scheduled' | 'converted' | 'lost';
      student_status: 'active' | 'paused' | 'archived';
      group_status: 'draft' | 'active' | 'paused' | 'closed';
      enrollment_status: 'active' | 'paused' | 'completed' | 'cancelled';
      invoice_status: 'draft' | 'issued' | 'paid' | 'partially_paid' | 'overdue' | 'cancelled';
      payment_status: 'pending' | 'redirected' | 'authorized' | 'paid' | 'succeeded' | 'failed' | 'refunded' | 'cancelled' | 'unknown';
      payment_provider: 'cash' | 'bank_transfer' | 'yookassa' | 'robokassa' | 'manual' | 'alfabank';
    };
  };
}

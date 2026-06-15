export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  audit: {
    Tables: {
      change_log: {
        Row: {
          actor_staff_id: string | null
          actor_user_id: string | null
          changed_columns: string[] | null
          id: number
          new_values: Json | null
          occurred_at: string
          old_values: Json | null
          operation: string
          row_id: string | null
          schema_name: string
          table_name: string
        }
        Insert: {
          actor_staff_id?: string | null
          actor_user_id?: string | null
          changed_columns?: string[] | null
          id?: number
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          operation: string
          row_id?: string | null
          schema_name: string
          table_name: string
        }
        Update: {
          actor_staff_id?: string | null
          actor_user_id?: string | null
          changed_columns?: string[] | null
          id?: number
          new_values?: Json | null
          occurred_at?: string
          old_values?: Json | null
          operation?: string
          row_id?: string | null
          schema_name?: string
          table_name?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  crm: {
    Tables: {
      appointment_settings: {
        Row: {
          booking_mode: string
          buffer_between_appointments_minutes: number
          default_online_instructions: string | null
          default_online_link: string | null
          graph_calendar_owner_email: string
          hours_by_weekday: Json
          id: string
          maximum_horizon_days: number
          minimum_lead_time_hours: number
          office_address: string
          office_arrival_instructions: string | null
          public_booking_enabled: boolean
          slot_increment_minutes: number
          teams_auto_create: boolean
          timezone: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          booking_mode?: string
          buffer_between_appointments_minutes?: number
          default_online_instructions?: string | null
          default_online_link?: string | null
          graph_calendar_owner_email?: string
          hours_by_weekday?: Json
          id?: string
          maximum_horizon_days?: number
          minimum_lead_time_hours?: number
          office_address?: string
          office_arrival_instructions?: string | null
          public_booking_enabled?: boolean
          slot_increment_minutes?: number
          teams_auto_create?: boolean
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          booking_mode?: string
          buffer_between_appointments_minutes?: number
          default_online_instructions?: string | null
          default_online_link?: string | null
          graph_calendar_owner_email?: string
          hours_by_weekday?: Json
          id?: string
          maximum_horizon_days?: number
          minimum_lead_time_hours?: number
          office_address?: string
          office_arrival_instructions?: string | null
          public_booking_enabled?: boolean
          slot_increment_minutes?: number
          teams_auto_create?: boolean
          timezone?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "appointment_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      appointment_types: {
        Row: {
          active: boolean
          code: string
          created_at: string
          default_location_type: string
          deleted_at: string | null
          description: string | null
          display_order: number
          duration_minutes: number
          fee_cad: number | null
          id: string
          is_public: boolean
          name: string
          preparation_notes: string | null
          requires_case: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          default_location_type?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          duration_minutes: number
          fee_cad?: number | null
          id?: string
          is_public?: boolean
          name: string
          preparation_notes?: string | null
          requires_case?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          default_location_type?: string
          deleted_at?: string | null
          description?: string | null
          display_order?: number
          duration_minutes?: number
          fee_cad?: number | null
          id?: string
          is_public?: boolean
          name?: string
          preparation_notes?: string | null
          requires_case?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_type_id: string
          assigned_staff_id: string | null
          booking_source: Database["crm"]["Enums"]["appointment_booking_source"]
          cancellation_reason: string | null
          cancelled_at: string | null
          cancelled_by: string | null
          case_id: string | null
          client_id: string | null
          confirmation_email_sent_at: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          ends_at: string
          fee_cad_at_booking: number | null
          graph_event_etag: string | null
          graph_event_id: string | null
          graph_sync_error: string | null
          graph_sync_status: string | null
          graph_synced_at: string | null
          id: string
          linked_payment_id: string | null
          location_type: string
          management_token: string | null
          management_token_expires_at: string | null
          online_link: string | null
          onsite_address: string | null
          payment_rejection_reason: string | null
          payment_reviewed_at: string | null
          payment_reviewed_by: string | null
          payment_screenshot_id: string | null
          payment_uploaded_at: string | null
          reason: string | null
          reminder_email_sent_at: string | null
          rescheduled_to: string | null
          snapshot_client_email: string
          snapshot_client_name: string
          snapshot_client_phone: string | null
          staff_notes: string | null
          starts_at: string
          status: Database["crm"]["Enums"]["appointment_status"]
          teams_join_url: string | null
          teams_meeting_id: string | null
          timezone: string
          updated_at: string
        }
        Insert: {
          appointment_type_id: string
          assigned_staff_id?: string | null
          booking_source?: Database["crm"]["Enums"]["appointment_booking_source"]
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          case_id?: string | null
          client_id?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ends_at: string
          fee_cad_at_booking?: number | null
          graph_event_etag?: string | null
          graph_event_id?: string | null
          graph_sync_error?: string | null
          graph_sync_status?: string | null
          graph_synced_at?: string | null
          id?: string
          linked_payment_id?: string | null
          location_type: string
          management_token?: string | null
          management_token_expires_at?: string | null
          online_link?: string | null
          onsite_address?: string | null
          payment_rejection_reason?: string | null
          payment_reviewed_at?: string | null
          payment_reviewed_by?: string | null
          payment_screenshot_id?: string | null
          payment_uploaded_at?: string | null
          reason?: string | null
          reminder_email_sent_at?: string | null
          rescheduled_to?: string | null
          snapshot_client_email: string
          snapshot_client_name: string
          snapshot_client_phone?: string | null
          staff_notes?: string | null
          starts_at: string
          status?: Database["crm"]["Enums"]["appointment_status"]
          teams_join_url?: string | null
          teams_meeting_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Update: {
          appointment_type_id?: string
          assigned_staff_id?: string | null
          booking_source?: Database["crm"]["Enums"]["appointment_booking_source"]
          cancellation_reason?: string | null
          cancelled_at?: string | null
          cancelled_by?: string | null
          case_id?: string | null
          client_id?: string | null
          confirmation_email_sent_at?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          ends_at?: string
          fee_cad_at_booking?: number | null
          graph_event_etag?: string | null
          graph_event_id?: string | null
          graph_sync_error?: string | null
          graph_sync_status?: string | null
          graph_synced_at?: string | null
          id?: string
          linked_payment_id?: string | null
          location_type?: string
          management_token?: string | null
          management_token_expires_at?: string | null
          online_link?: string | null
          onsite_address?: string | null
          payment_rejection_reason?: string | null
          payment_reviewed_at?: string | null
          payment_reviewed_by?: string | null
          payment_screenshot_id?: string | null
          payment_uploaded_at?: string | null
          reason?: string | null
          reminder_email_sent_at?: string | null
          rescheduled_to?: string | null
          snapshot_client_email?: string
          snapshot_client_name?: string
          snapshot_client_phone?: string | null
          staff_notes?: string | null
          starts_at?: string
          status?: Database["crm"]["Enums"]["appointment_status"]
          teams_join_url?: string | null
          teams_meeting_id?: string | null
          timezone?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_appointment_type_id_fkey"
            columns: ["appointment_type_id"]
            isOneToOne: false
            referencedRelation: "appointment_types"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_assigned_staff_id_fkey"
            columns: ["assigned_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_cancelled_by_fkey"
            columns: ["cancelled_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_case_chip_inputs"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "appointments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_linked_payment_id_fkey"
            columns: ["linked_payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_payment_reviewed_by_fkey"
            columns: ["payment_reviewed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_rescheduled_to_fkey"
            columns: ["rescheduled_to"]
            isOneToOne: false
            referencedRelation: "appointments"
            referencedColumns: ["id"]
          },
        ]
      }
      case_events: {
        Row: {
          case_id: string
          corrects_event: string | null
          created_at: string
          created_by: string | null
          description: string | null
          event_data: Json
          event_type: Database["crm"]["Enums"]["event_type"]
          id: string
          occurred_at: string
          visible_to_client: boolean
        }
        Insert: {
          case_id: string
          corrects_event?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_data?: Json
          event_type: Database["crm"]["Enums"]["event_type"]
          id?: string
          occurred_at?: string
          visible_to_client?: boolean
        }
        Update: {
          case_id?: string
          corrects_event?: string | null
          created_at?: string
          created_by?: string | null
          description?: string | null
          event_data?: Json
          event_type?: Database["crm"]["Enums"]["event_type"]
          id?: string
          occurred_at?: string
          visible_to_client?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_events_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_case_chip_inputs"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_events_corrects_event_fkey"
            columns: ["corrects_event"]
            isOneToOne: false
            referencedRelation: "case_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_events_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      case_participants: {
        Row: {
          added_at: string
          case_id: string
          client_id: string
          id: string
          role: Database["crm"]["Enums"]["participant_role"]
        }
        Insert: {
          added_at?: string
          case_id: string
          client_id: string
          id?: string
          role: Database["crm"]["Enums"]["participant_role"]
        }
        Update: {
          added_at?: string
          case_id?: string
          client_id?: string
          id?: string
          role?: Database["crm"]["Enums"]["participant_role"]
        }
        Relationships: [
          {
            foreignKeyName: "case_participants_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_participants_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_case_chip_inputs"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_participants_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      case_required_documents: {
        Row: {
          case_id: string
          custom_label: string | null
          document_code: string | null
          due_date: string | null
          id: string
          requested_at_event_id: string | null
          set_at: string
          set_by: string | null
        }
        Insert: {
          case_id: string
          custom_label?: string | null
          document_code?: string | null
          due_date?: string | null
          id?: string
          requested_at_event_id?: string | null
          set_at?: string
          set_by?: string | null
        }
        Update: {
          case_id?: string
          custom_label?: string | null
          document_code?: string | null
          due_date?: string | null
          id?: string
          requested_at_event_id?: string | null
          set_at?: string
          set_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "case_required_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_required_documents_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_case_chip_inputs"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "case_required_documents_requested_at_event_id_fkey"
            columns: ["requested_at_event_id"]
            isOneToOne: false
            referencedRelation: "case_events"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "case_required_documents_set_by_fkey"
            columns: ["set_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      cases: {
        Row: {
          assigned_paralegal: string | null
          assigned_rcic: string
          biometrics_record_id: string | null
          biometrics_status: Database["crm"]["Enums"]["biometrics_status"]
          case_number: string
          client_id: string
          client_portal_token: string | null
          client_portal_token_created_at: string | null
          closed_at: string | null
          conditional_flags: Json
          created_at: string
          created_by: string | null
          decided_at: string | null
          deleted_at: string | null
          government_fee_cad: number | null
          id: string
          internal_notes: string | null
          ircc_application_number: string | null
          ircc_portal_link: string | null
          ircc_uci: string | null
          opened_at: string
          outcome_notes: string | null
          priority: string | null
          quoted_fee_cad: number
          retained_at: string | null
          retainer_minimum_cad: number | null
          service_template_id: string
          service_type_id: string
          sharepoint_folder_id: string | null
          sharepoint_folder_url: string | null
          status: Database["crm"]["Enums"]["case_status"]
          submitted_at: string | null
          updated_at: string
        }
        Insert: {
          assigned_paralegal?: string | null
          assigned_rcic: string
          biometrics_record_id?: string | null
          biometrics_status?: Database["crm"]["Enums"]["biometrics_status"]
          case_number: string
          client_id: string
          client_portal_token?: string | null
          client_portal_token_created_at?: string | null
          closed_at?: string | null
          conditional_flags?: Json
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          deleted_at?: string | null
          government_fee_cad?: number | null
          id?: string
          internal_notes?: string | null
          ircc_application_number?: string | null
          ircc_portal_link?: string | null
          ircc_uci?: string | null
          opened_at?: string
          outcome_notes?: string | null
          priority?: string | null
          quoted_fee_cad: number
          retained_at?: string | null
          retainer_minimum_cad?: number | null
          service_template_id: string
          service_type_id: string
          sharepoint_folder_id?: string | null
          sharepoint_folder_url?: string | null
          status?: Database["crm"]["Enums"]["case_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Update: {
          assigned_paralegal?: string | null
          assigned_rcic?: string
          biometrics_record_id?: string | null
          biometrics_status?: Database["crm"]["Enums"]["biometrics_status"]
          case_number?: string
          client_id?: string
          client_portal_token?: string | null
          client_portal_token_created_at?: string | null
          closed_at?: string | null
          conditional_flags?: Json
          created_at?: string
          created_by?: string | null
          decided_at?: string | null
          deleted_at?: string | null
          government_fee_cad?: number | null
          id?: string
          internal_notes?: string | null
          ircc_application_number?: string | null
          ircc_portal_link?: string | null
          ircc_uci?: string | null
          opened_at?: string
          outcome_notes?: string | null
          priority?: string | null
          quoted_fee_cad?: number
          retained_at?: string | null
          retainer_minimum_cad?: number | null
          service_template_id?: string
          service_type_id?: string
          sharepoint_folder_id?: string | null
          sharepoint_folder_url?: string | null
          status?: Database["crm"]["Enums"]["case_status"]
          submitted_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "cases_assigned_paralegal_fkey"
            columns: ["assigned_paralegal"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_assigned_rcic_fkey"
            columns: ["assigned_rcic"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_biometrics_record_id_fkey"
            columns: ["biometrics_record_id"]
            isOneToOne: false
            referencedRelation: "client_biometric_records"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "cases_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      client_address_history: {
        Row: {
          address_line: string
          city: string | null
          client_id: string
          country_code: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          display_order: number
          id: string
          notes: string | null
          province_state: string | null
        }
        Insert: {
          address_line: string
          city?: string | null
          client_id: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          id?: string
          notes?: string | null
          province_state?: string | null
        }
        Update: {
          address_line?: string
          city?: string | null
          client_id?: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          id?: string
          notes?: string | null
          province_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_address_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_biometric_records: {
        Row: {
          application_context: string | null
          biometrics_type: string | null
          bvn_or_reference: string | null
          client_id: string
          created_at: string
          created_by: string | null
          date_given: string
          deleted_at: string | null
          display_order: number
          id: string
          location: string | null
          notes: string | null
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          application_context?: string | null
          biometrics_type?: string | null
          bvn_or_reference?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          date_given: string
          deleted_at?: string | null
          display_order?: number
          id?: string
          location?: string | null
          notes?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          application_context?: string | null
          biometrics_type?: string | null
          bvn_or_reference?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          date_given?: string
          deleted_at?: string | null
          display_order?: number
          id?: string
          location?: string | null
          notes?: string | null
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_biometric_records_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "client_biometric_records_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      client_education_history: {
        Row: {
          city: string | null
          client_id: string
          country_code: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          display_order: number
          field_of_study: string | null
          id: string
          institution: string
          level: string | null
          notes: string | null
          province_state: string | null
        }
        Insert: {
          city?: string | null
          client_id: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          field_of_study?: string | null
          id?: string
          institution: string
          level?: string | null
          notes?: string | null
          province_state?: string | null
        }
        Update: {
          city?: string | null
          client_id?: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          field_of_study?: string | null
          id?: string
          institution?: string
          level?: string | null
          notes?: string | null
          province_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_education_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_employment_history: {
        Row: {
          activity_type: string | null
          city: string | null
          client_id: string
          country_code: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          display_order: number
          employer: string | null
          id: string
          is_ongoing: boolean
          notes: string | null
          occupation: string
          province_state: string | null
        }
        Insert: {
          activity_type?: string | null
          city?: string | null
          client_id: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          employer?: string | null
          id?: string
          is_ongoing?: boolean
          notes?: string | null
          occupation: string
          province_state?: string | null
        }
        Update: {
          activity_type?: string | null
          city?: string | null
          client_id?: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          employer?: string | null
          id?: string
          is_ongoing?: boolean
          notes?: string | null
          occupation?: string
          province_state?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_employment_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_family_members: {
        Row: {
          accompanying_to_canada: boolean | null
          client_id: string
          country_of_birth: string | null
          created_at: string
          date_of_birth: string | null
          deceased_date: string | null
          deceased_location: string | null
          display_order: number
          full_name: string
          id: string
          is_deceased: boolean
          marital_status: Database["crm"]["Enums"]["marital_status"] | null
          notes: string | null
          present_address: string | null
          present_occupation: string | null
          relationship: Database["crm"]["Enums"]["relationship_type"]
          updated_at: string
        }
        Insert: {
          accompanying_to_canada?: boolean | null
          client_id: string
          country_of_birth?: string | null
          created_at?: string
          date_of_birth?: string | null
          deceased_date?: string | null
          deceased_location?: string | null
          display_order?: number
          full_name: string
          id?: string
          is_deceased?: boolean
          marital_status?: Database["crm"]["Enums"]["marital_status"] | null
          notes?: string | null
          present_address?: string | null
          present_occupation?: string | null
          relationship: Database["crm"]["Enums"]["relationship_type"]
          updated_at?: string
        }
        Update: {
          accompanying_to_canada?: boolean | null
          client_id?: string
          country_of_birth?: string | null
          created_at?: string
          date_of_birth?: string | null
          deceased_date?: string | null
          deceased_location?: string | null
          display_order?: number
          full_name?: string
          id?: string
          is_deceased?: boolean
          marital_status?: Database["crm"]["Enums"]["marital_status"] | null
          notes?: string | null
          present_address?: string | null
          present_occupation?: string | null
          relationship?: Database["crm"]["Enums"]["relationship_type"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_family_members_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_government_positions: {
        Row: {
          city: string | null
          client_id: string
          country_code: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          department: string | null
          display_order: number
          id: string
          is_ongoing: boolean
          level_of_jurisdiction: string | null
          notes: string | null
          position_held: string | null
          province_state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          client_id: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          department?: string | null
          display_order?: number
          id?: string
          is_ongoing?: boolean
          level_of_jurisdiction?: string | null
          notes?: string | null
          position_held?: string | null
          province_state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          client_id?: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          department?: string | null
          display_order?: number
          id?: string
          is_ongoing?: boolean
          level_of_jurisdiction?: string | null
          notes?: string | null
          position_held?: string | null
          province_state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_government_positions_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_military_services: {
        Row: {
          active_combat_details: string | null
          branch_name: string | null
          client_id: string
          commanding_officer: string | null
          country_code: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          display_order: number
          id: string
          is_ongoing: boolean
          military_rank: string | null
          notes: string | null
          reason_for_end_of_service: string | null
          updated_at: string
        }
        Insert: {
          active_combat_details?: string | null
          branch_name?: string | null
          client_id: string
          commanding_officer?: string | null
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          id?: string
          is_ongoing?: boolean
          military_rank?: string | null
          notes?: string | null
          reason_for_end_of_service?: string | null
          updated_at?: string
        }
        Update: {
          active_combat_details?: string | null
          branch_name?: string | null
          client_id?: string
          commanding_officer?: string | null
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          id?: string
          is_ongoing?: boolean
          military_rank?: string | null
          notes?: string | null
          reason_for_end_of_service?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_military_services_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_organisations: {
        Row: {
          city: string | null
          client_id: string
          country_code: string | null
          created_at: string
          date_from: string | null
          date_to: string | null
          display_order: number
          id: string
          is_ongoing: boolean
          notes: string | null
          organisation_name: string
          organisation_type: string | null
          position_held: string | null
          province_state: string | null
          updated_at: string
        }
        Insert: {
          city?: string | null
          client_id: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          id?: string
          is_ongoing?: boolean
          notes?: string | null
          organisation_name: string
          organisation_type?: string | null
          position_held?: string | null
          province_state?: string | null
          updated_at?: string
        }
        Update: {
          city?: string | null
          client_id?: string
          country_code?: string | null
          created_at?: string
          date_from?: string | null
          date_to?: string | null
          display_order?: number
          id?: string
          is_ongoing?: boolean
          notes?: string | null
          organisation_name?: string
          organisation_type?: string | null
          position_held?: string | null
          province_state?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "client_organisations_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      client_travel_history: {
        Row: {
          city: string | null
          client_id: string
          country_code: string | null
          created_at: string
          date_from: string
          date_to: string
          days: number | null
          display_order: number
          id: string
          notes: string | null
          purpose: string | null
        }
        Insert: {
          city?: string | null
          client_id: string
          country_code?: string | null
          created_at?: string
          date_from: string
          date_to: string
          days?: number | null
          display_order?: number
          id?: string
          notes?: string | null
          purpose?: string | null
        }
        Update: {
          city?: string | null
          client_id?: string
          country_code?: string | null
          created_at?: string
          date_from?: string
          date_to?: string
          days?: number | null
          display_order?: number
          id?: string
          notes?: string | null
          purpose?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "client_travel_history_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
        ]
      }
      clients: {
        Row: {
          address_line1: string | null
          address_line2: string | null
          assigned_rcic: string | null
          background_responses: Json
          city: string | null
          client_number: string
          country_code: string | null
          country_of_birth: string | null
          country_of_citizenship: string | null
          country_of_residence: string | null
          created_at: string
          created_by: string | null
          custom_fields: Json | null
          date_of_birth: string | null
          deleted_at: string | null
          email: string | null
          family_name: string | null
          gender: Database["crm"]["Enums"]["gender"] | null
          given_names: string | null
          government_position_held: boolean | null
          has_children: boolean | null
          has_prior_biometrics: boolean | null
          has_siblings: boolean | null
          id: string
          intake_portal_token: string | null
          intake_portal_token_created_at: string | null
          intake_submitted_at: string | null
          legal_name_full: string
          marital_status: Database["crm"]["Enums"]["marital_status"] | null
          military_service_held: boolean | null
          notes: string | null
          organisations_member: boolean | null
          phone_primary: string | null
          phone_whatsapp: string | null
          postal_code: string | null
          preferred_contact: string | null
          preferred_language: string | null
          preferred_name: string | null
          primary_contact_staff: string | null
          province_state: string | null
          referred_by: string | null
          source: string | null
          status: Database["crm"]["Enums"]["client_status"]
          travel_completed: boolean | null
          updated_at: string
          years_elementary: number | null
          years_post_secondary: number | null
          years_secondary: number | null
          years_trade_other: number | null
        }
        Insert: {
          address_line1?: string | null
          address_line2?: string | null
          assigned_rcic?: string | null
          background_responses?: Json
          city?: string | null
          client_number: string
          country_code?: string | null
          country_of_birth?: string | null
          country_of_citizenship?: string | null
          country_of_residence?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          family_name?: string | null
          gender?: Database["crm"]["Enums"]["gender"] | null
          given_names?: string | null
          government_position_held?: boolean | null
          has_children?: boolean | null
          has_prior_biometrics?: boolean | null
          has_siblings?: boolean | null
          id?: string
          intake_portal_token?: string | null
          intake_portal_token_created_at?: string | null
          intake_submitted_at?: string | null
          legal_name_full: string
          marital_status?: Database["crm"]["Enums"]["marital_status"] | null
          military_service_held?: boolean | null
          notes?: string | null
          organisations_member?: boolean | null
          phone_primary?: string | null
          phone_whatsapp?: string | null
          postal_code?: string | null
          preferred_contact?: string | null
          preferred_language?: string | null
          preferred_name?: string | null
          primary_contact_staff?: string | null
          province_state?: string | null
          referred_by?: string | null
          source?: string | null
          status?: Database["crm"]["Enums"]["client_status"]
          travel_completed?: boolean | null
          updated_at?: string
          years_elementary?: number | null
          years_post_secondary?: number | null
          years_secondary?: number | null
          years_trade_other?: number | null
        }
        Update: {
          address_line1?: string | null
          address_line2?: string | null
          assigned_rcic?: string | null
          background_responses?: Json
          city?: string | null
          client_number?: string
          country_code?: string | null
          country_of_birth?: string | null
          country_of_citizenship?: string | null
          country_of_residence?: string | null
          created_at?: string
          created_by?: string | null
          custom_fields?: Json | null
          date_of_birth?: string | null
          deleted_at?: string | null
          email?: string | null
          family_name?: string | null
          gender?: Database["crm"]["Enums"]["gender"] | null
          given_names?: string | null
          government_position_held?: boolean | null
          has_children?: boolean | null
          has_prior_biometrics?: boolean | null
          has_siblings?: boolean | null
          id?: string
          intake_portal_token?: string | null
          intake_portal_token_created_at?: string | null
          intake_submitted_at?: string | null
          legal_name_full?: string
          marital_status?: Database["crm"]["Enums"]["marital_status"] | null
          military_service_held?: boolean | null
          notes?: string | null
          organisations_member?: boolean | null
          phone_primary?: string | null
          phone_whatsapp?: string | null
          postal_code?: string | null
          preferred_contact?: string | null
          preferred_language?: string | null
          preferred_name?: string | null
          primary_contact_staff?: string | null
          province_state?: string | null
          referred_by?: string | null
          source?: string | null
          status?: Database["crm"]["Enums"]["client_status"]
          travel_completed?: boolean | null
          updated_at?: string
          years_elementary?: number | null
          years_post_secondary?: number | null
          years_secondary?: number | null
          years_trade_other?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "clients_assigned_rcic_fkey"
            columns: ["assigned_rcic"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clients_primary_contact_staff_fkey"
            columns: ["primary_contact_staff"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          attachment_ids: string[] | null
          body: string | null
          case_id: string | null
          cc_addresses: string[] | null
          channel: Database["crm"]["Enums"]["communication_channel"]
          client_id: string | null
          deleted_at: string | null
          direction: Database["crm"]["Enums"]["communication_direction"]
          email_message_id: string | null
          from_address: string | null
          handled_by: string | null
          id: string
          logged_at: string
          logged_by: string | null
          occurred_at: string
          subject: string | null
          summary: string | null
          to_addresses: string[] | null
        }
        Insert: {
          attachment_ids?: string[] | null
          body?: string | null
          case_id?: string | null
          cc_addresses?: string[] | null
          channel: Database["crm"]["Enums"]["communication_channel"]
          client_id?: string | null
          deleted_at?: string | null
          direction: Database["crm"]["Enums"]["communication_direction"]
          email_message_id?: string | null
          from_address?: string | null
          handled_by?: string | null
          id?: string
          logged_at?: string
          logged_by?: string | null
          occurred_at?: string
          subject?: string | null
          summary?: string | null
          to_addresses?: string[] | null
        }
        Update: {
          attachment_ids?: string[] | null
          body?: string | null
          case_id?: string | null
          cc_addresses?: string[] | null
          channel?: Database["crm"]["Enums"]["communication_channel"]
          client_id?: string | null
          deleted_at?: string | null
          direction?: Database["crm"]["Enums"]["communication_direction"]
          email_message_id?: string | null
          from_address?: string | null
          handled_by?: string | null
          id?: string
          logged_at?: string
          logged_by?: string | null
          occurred_at?: string
          subject?: string | null
          summary?: string | null
          to_addresses?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "communications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_case_chip_inputs"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "communications_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_handled_by_fkey"
            columns: ["handled_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_logged_by_fkey"
            columns: ["logged_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_line_items: {
        Row: {
          description: string
          display_order: number
          id: string
          invoice_id: string
          line_total_cad: number
          quantity: number
          unit_price_cad: number
        }
        Insert: {
          description: string
          display_order?: number
          id?: string
          invoice_id: string
          line_total_cad: number
          quantity?: number
          unit_price_cad: number
        }
        Update: {
          description?: string
          display_order?: number
          id?: string
          invoice_id?: string
          line_total_cad?: number
          quantity?: number
          unit_price_cad?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_line_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          case_id: string | null
          client_id: string
          created_at: string
          created_by: string | null
          deleted_at: string | null
          due_date: string | null
          hst_cad: number
          id: string
          invoice_number: string
          issued_date: string
          notes: string | null
          paid_cad: number
          status: Database["crm"]["Enums"]["invoice_status"]
          subtotal_cad: number
          total_cad: number
          updated_at: string
        }
        Insert: {
          case_id?: string | null
          client_id: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_date?: string | null
          hst_cad?: number
          id?: string
          invoice_number: string
          issued_date?: string
          notes?: string | null
          paid_cad?: number
          status?: Database["crm"]["Enums"]["invoice_status"]
          subtotal_cad: number
          total_cad: number
          updated_at?: string
        }
        Update: {
          case_id?: string | null
          client_id?: string
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          due_date?: string | null
          hst_cad?: number
          id?: string
          invoice_number?: string
          issued_date?: string
          notes?: string | null
          paid_cad?: number
          status?: Database["crm"]["Enums"]["invoice_status"]
          subtotal_cad?: number
          total_cad?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_case_chip_inputs"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "invoices_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_cad: number
          case_id: string | null
          client_id: string
          client_uploaded_at: string | null
          consultation_payment_nature: string | null
          created_at: string
          deleted_at: string | null
          id: string
          invoice_id: string | null
          is_refund: boolean
          method: Database["crm"]["Enums"]["payment_method"]
          notes: string | null
          proof_document_id: string | null
          received_date: string
          recorded_by: string | null
          reference: string | null
        }
        Insert: {
          amount_cad: number
          case_id?: string | null
          client_id: string
          client_uploaded_at?: string | null
          consultation_payment_nature?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          invoice_id?: string | null
          is_refund?: boolean
          method: Database["crm"]["Enums"]["payment_method"]
          notes?: string | null
          proof_document_id?: string | null
          received_date?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Update: {
          amount_cad?: number
          case_id?: string | null
          client_id?: string
          client_uploaded_at?: string | null
          consultation_payment_nature?: string | null
          created_at?: string
          deleted_at?: string | null
          id?: string
          invoice_id?: string | null
          is_refund?: boolean
          method?: Database["crm"]["Enums"]["payment_method"]
          notes?: string | null
          proof_document_id?: string | null
          received_date?: string
          recorded_by?: string | null
          reference?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_case_chip_inputs"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "payments_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      retainer_agreements: {
        Row: {
          case_id: string
          client_address_at_signing: string | null
          client_email_at_signing: string | null
          client_family_name_at_signing: string | null
          client_given_names_at_signing: string | null
          client_legal_name_full_at_signing: string | null
          client_phone_at_signing: string | null
          client_signature_image_url: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          final_document_id: string | null
          first_installment_cad: number | null
          government_fee_cad: number | null
          hst_cad: number | null
          id: string
          last_resent_at: string | null
          method: Database["crm"]["Enums"]["retainer_method"] | null
          notes: string | null
          quoted_fee_cad_at_signing: number | null
          rcic_address_at_signing: string | null
          rcic_cell_phone_at_signing: string | null
          rcic_email_at_signing: string | null
          rcic_family_name_at_signing: string | null
          rcic_given_name_at_signing: string | null
          rcic_id: string | null
          rcic_membership_number_at_signing: string | null
          rcic_name_at_signing: string | null
          rcic_office_phone_at_signing: string | null
          rcic_phone_at_signing: string | null
          rcic_printed_name_at_signing: string | null
          rcic_signature_image_url_at_signing: string | null
          resent_count: number
          second_installment_cad: number | null
          sent_at: string | null
          sent_to_email: string | null
          sent_to_phone: string | null
          service_description: string | null
          signed_at: string | null
          signed_by_staff_id: string | null
          signed_ip_address: unknown
          signed_user_agent: string | null
          signing_token: string | null
          status: Database["crm"]["Enums"]["retainer_agreement_status"]
          template_version: string
          token_expires_at: string | null
          updated_at: string
          void_reason: string | null
          voided_at: string | null
          voided_by: string | null
          withdrawal_refund_floor_cad: number | null
        }
        Insert: {
          case_id: string
          client_address_at_signing?: string | null
          client_email_at_signing?: string | null
          client_family_name_at_signing?: string | null
          client_given_names_at_signing?: string | null
          client_legal_name_full_at_signing?: string | null
          client_phone_at_signing?: string | null
          client_signature_image_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          final_document_id?: string | null
          first_installment_cad?: number | null
          government_fee_cad?: number | null
          hst_cad?: number | null
          id?: string
          last_resent_at?: string | null
          method?: Database["crm"]["Enums"]["retainer_method"] | null
          notes?: string | null
          quoted_fee_cad_at_signing?: number | null
          rcic_address_at_signing?: string | null
          rcic_cell_phone_at_signing?: string | null
          rcic_email_at_signing?: string | null
          rcic_family_name_at_signing?: string | null
          rcic_given_name_at_signing?: string | null
          rcic_id?: string | null
          rcic_membership_number_at_signing?: string | null
          rcic_name_at_signing?: string | null
          rcic_office_phone_at_signing?: string | null
          rcic_phone_at_signing?: string | null
          rcic_printed_name_at_signing?: string | null
          rcic_signature_image_url_at_signing?: string | null
          resent_count?: number
          second_installment_cad?: number | null
          sent_at?: string | null
          sent_to_email?: string | null
          sent_to_phone?: string | null
          service_description?: string | null
          signed_at?: string | null
          signed_by_staff_id?: string | null
          signed_ip_address?: unknown
          signed_user_agent?: string | null
          signing_token?: string | null
          status?: Database["crm"]["Enums"]["retainer_agreement_status"]
          template_version?: string
          token_expires_at?: string | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          withdrawal_refund_floor_cad?: number | null
        }
        Update: {
          case_id?: string
          client_address_at_signing?: string | null
          client_email_at_signing?: string | null
          client_family_name_at_signing?: string | null
          client_given_names_at_signing?: string | null
          client_legal_name_full_at_signing?: string | null
          client_phone_at_signing?: string | null
          client_signature_image_url?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          final_document_id?: string | null
          first_installment_cad?: number | null
          government_fee_cad?: number | null
          hst_cad?: number | null
          id?: string
          last_resent_at?: string | null
          method?: Database["crm"]["Enums"]["retainer_method"] | null
          notes?: string | null
          quoted_fee_cad_at_signing?: number | null
          rcic_address_at_signing?: string | null
          rcic_cell_phone_at_signing?: string | null
          rcic_email_at_signing?: string | null
          rcic_family_name_at_signing?: string | null
          rcic_given_name_at_signing?: string | null
          rcic_id?: string | null
          rcic_membership_number_at_signing?: string | null
          rcic_name_at_signing?: string | null
          rcic_office_phone_at_signing?: string | null
          rcic_phone_at_signing?: string | null
          rcic_printed_name_at_signing?: string | null
          rcic_signature_image_url_at_signing?: string | null
          resent_count?: number
          second_installment_cad?: number | null
          sent_at?: string | null
          sent_to_email?: string | null
          sent_to_phone?: string | null
          service_description?: string | null
          signed_at?: string | null
          signed_by_staff_id?: string | null
          signed_ip_address?: unknown
          signed_user_agent?: string | null
          signing_token?: string | null
          status?: Database["crm"]["Enums"]["retainer_agreement_status"]
          template_version?: string
          token_expires_at?: string | null
          updated_at?: string
          void_reason?: string | null
          voided_at?: string | null
          voided_by?: string | null
          withdrawal_refund_floor_cad?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "retainer_agreements_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retainer_agreements_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: true
            referencedRelation: "v_case_chip_inputs"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "retainer_agreements_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retainer_agreements_rcic_id_fkey"
            columns: ["rcic_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retainer_agreements_signed_by_staff_id_fkey"
            columns: ["signed_by_staff_id"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "retainer_agreements_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      staff: {
        Row: {
          auth_user_id: string
          can_be_assigned_cases: boolean
          cell_phone: string | null
          cicc_license_no: string | null
          created_at: string
          created_by_staff: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          deleted_at: string | null
          email: string
          first_name: string
          id: string
          is_active: boolean
          is_rcic: boolean
          last_login_at: string | null
          last_name: string
          office_address: string | null
          office_phone: string | null
          password_reset_required_at: string | null
          permission_overrides: Json
          phone: string | null
          printed_name_for_signature: string | null
          rcic_membership_number: string | null
          role: Database["crm"]["Enums"]["staff_role"]
          signature_capture_method: string | null
          signature_image_set_at: string | null
          signature_image_url: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id: string
          can_be_assigned_cases?: boolean
          cell_phone?: string | null
          cicc_license_no?: string | null
          created_at?: string
          created_by_staff?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deleted_at?: string | null
          email: string
          first_name: string
          id?: string
          is_active?: boolean
          is_rcic?: boolean
          last_login_at?: string | null
          last_name: string
          office_address?: string | null
          office_phone?: string | null
          password_reset_required_at?: string | null
          permission_overrides?: Json
          phone?: string | null
          printed_name_for_signature?: string | null
          rcic_membership_number?: string | null
          role: Database["crm"]["Enums"]["staff_role"]
          signature_capture_method?: string | null
          signature_image_set_at?: string | null
          signature_image_url?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string
          can_be_assigned_cases?: boolean
          cell_phone?: string | null
          cicc_license_no?: string | null
          created_at?: string
          created_by_staff?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deleted_at?: string | null
          email?: string
          first_name?: string
          id?: string
          is_active?: boolean
          is_rcic?: boolean
          last_login_at?: string | null
          last_name?: string
          office_address?: string | null
          office_phone?: string | null
          password_reset_required_at?: string | null
          permission_overrides?: Json
          phone?: string | null
          printed_name_for_signature?: string | null
          rcic_membership_number?: string | null
          role?: Database["crm"]["Enums"]["staff_role"]
          signature_capture_method?: string | null
          signature_image_set_at?: string | null
          signature_image_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_created_by_staff_fkey"
            columns: ["created_by_staff"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "staff_deactivated_by_fkey"
            columns: ["deactivated_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
      tasks: {
        Row: {
          alert_days_before: number[] | null
          alerts_sent_at: string[] | null
          assigned_to: string | null
          case_id: string | null
          client_id: string | null
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          deleted_at: string | null
          description: string | null
          due_at: string | null
          due_date: string | null
          id: string
          priority: string | null
          status: Database["crm"]["Enums"]["task_status"]
          task_type: Database["crm"]["Enums"]["task_type"]
          title: string
          updated_at: string
        }
        Insert: {
          alert_days_before?: number[] | null
          alerts_sent_at?: string[] | null
          assigned_to?: string | null
          case_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: Database["crm"]["Enums"]["task_status"]
          task_type: Database["crm"]["Enums"]["task_type"]
          title: string
          updated_at?: string
        }
        Update: {
          alert_days_before?: number[] | null
          alerts_sent_at?: string[] | null
          assigned_to?: string | null
          case_id?: string | null
          client_id?: string | null
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          deleted_at?: string | null
          description?: string | null
          due_at?: string | null
          due_date?: string | null
          id?: string
          priority?: string | null
          status?: Database["crm"]["Enums"]["task_status"]
          task_type?: Database["crm"]["Enums"]["task_type"]
          title?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "v_case_chip_inputs"
            referencedColumns: ["case_id"]
          },
          {
            foreignKeyName: "tasks_client_id_fkey"
            columns: ["client_id"]
            isOneToOne: false
            referencedRelation: "clients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_completed_by_fkey"
            columns: ["completed_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "staff"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      v_case_chip_inputs: {
        Row: {
          accepted_docs: number | null
          additional_docs_accepted: number | null
          additional_docs_latest_due: string | null
          additional_docs_requested: number | null
          additional_docs_submitted_after_request: boolean | null
          additional_docs_uploaded: number | null
          biometrics_status:
            | Database["crm"]["Enums"]["biometrics_status"]
            | null
          case_id: string | null
          collected_cad: number | null
          last_rejected_at: string | null
          latest_event_at: string | null
          latest_event_data: Json | null
          latest_event_type: Database["crm"]["Enums"]["event_type"] | null
          quoted_fee_cad: number | null
          rejected_docs: number | null
          required_docs: number | null
          retainer_has_fee_breakdown: boolean | null
          retainer_minimum_cad: number | null
          retainer_sent_at: string | null
          retainer_status:
            | Database["crm"]["Enums"]["retainer_agreement_status"]
            | null
          status: Database["crm"]["Enums"]["case_status"] | null
          updated_at: string | null
          uploaded_docs: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      appointment_slot_is_free: {
        Args: {
          p_ends_at: string
          p_exclude_appointment_id?: string
          p_starts_at: string
        }
        Returns: boolean
      }
      can_advance_phase: {
        Args: {
          p_case_id: string
          p_target_status: Database["crm"]["Enums"]["case_status"]
        }
        Returns: {
          allowed: boolean
          reason: string
        }[]
      }
      case_total_collected: { Args: { p_case_id: string }; Returns: number }
      current_staff_id: { Args: never; Returns: string }
      current_staff_role: {
        Args: never
        Returns: Database["crm"]["Enums"]["staff_role"]
      }
      generate_case_number: { Args: never; Returns: string }
      generate_client_number: { Args: never; Returns: string }
      generate_invoice_number: { Args: never; Returns: string }
      phase_of: {
        Args: { status: Database["crm"]["Enums"]["case_status"] }
        Returns: string
      }
      staff_can: {
        Args: { p_permission: string; p_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      appointment_booking_source: "staff" | "public_portal" | "manual_import"
      appointment_status:
        | "confirmed"
        | "rescheduled"
        | "cancelled"
        | "completed"
        | "no_show"
        | "pending_payment"
        | "awaiting_review"
      biometrics_status:
        | "not_applicable"
        | "previously_given_valid"
        | "previously_given_expired"
        | "pending"
        | "requested_by_ircc"
        | "scheduled"
        | "completed"
        | "exempt"
      case_status:
        | "retainer_pending"
        | "documentation_in_progress"
        | "documentation_review"
        | "submitted_to_ircc"
        | "passport_requested"
        | "refused"
        | "closed"
      client_status: "lead" | "active" | "dormant" | "closed"
      communication_channel:
        | "email"
        | "phone_call"
        | "whatsapp"
        | "sms"
        | "in_person"
        | "instagram"
        | "facebook_messenger"
        | "portal_message"
        | "letter"
        | "other"
      communication_direction: "inbound" | "outbound"
      event_type:
        | "status_changed"
        | "note_added"
        | "document_received"
        | "document_requested"
        | "document_accepted"
        | "document_rejected"
        | "communication_sent"
        | "communication_received"
        | "fee_quoted"
        | "fee_collected"
        | "fee_refunded"
        | "deadline_set"
        | "deadline_met"
        | "deadline_missed"
        | "phase_advance_attempted"
        | "phase_advance_blocked"
        | "ircc_update"
        | "correction"
        | "other"
        | "retainer_prepared"
        | "retainer_sent"
        | "retainer_signed"
        | "retainer_voided"
        | "retainer_uploaded"
        | "retainer_resent"
        | "biometrics_requested"
        | "biometrics_scheduled"
        | "biometrics_completed"
        | "additional_info_requested"
        | "additional_info_submitted"
        | "interview_scheduled"
        | "interview_completed"
        | "application_returned"
        | "appeal_filed"
        | "withdrawal_requested"
        | "additional_documents_requested"
        | "document_viewed"
      gender: "male" | "female" | "other" | "prefer_not_to_say"
      invoice_status: "draft" | "sent" | "partial" | "paid" | "void" | "overdue"
      marital_status:
        | "single"
        | "married"
        | "common_law"
        | "divorced"
        | "widowed"
        | "separated"
        | "annulled"
      participant_role:
        | "principal"
        | "spouse"
        | "dependent_child"
        | "co_applicant"
        | "sponsor"
      payment_method:
        | "e_transfer"
        | "stripe"
        | "bank_transfer"
        | "cash"
        | "cheque"
        | "wire"
        | "other"
      relationship_type:
        | "father"
        | "mother"
        | "spouse"
        | "common_law_partner"
        | "son"
        | "daughter"
        | "step_son"
        | "step_daughter"
        | "adopted_son"
        | "adopted_daughter"
        | "brother"
        | "sister"
        | "half_brother"
        | "half_sister"
        | "step_brother"
        | "step_sister"
        | "guardian"
        | "other"
      retainer_agreement_status:
        | "draft"
        | "pending_signature"
        | "signed"
        | "uploaded"
        | "void"
        | "expired"
      retainer_method:
        | "online_signature"
        | "signature_image_overlay"
        | "scanned_upload"
      staff_role:
        | "admin"
        | "rcic"
        | "paralegal"
        | "staff"
        | "readonly"
        | "super_user"
        | "document_officer"
        | "reception"
      task_status: "open" | "in_progress" | "blocked" | "done" | "cancelled"
      task_type:
        | "document_collection"
        | "form_completion"
        | "review_required"
        | "submission"
        | "biometrics_appointment"
        | "medical_exam"
        | "ircc_response"
        | "follow_up_client"
        | "permit_expiry_alert"
        | "language_test_expiry"
        | "eca_expiry"
        | "custom"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  files: {
    Tables: {
      documents: {
        Row: {
          case_id: string | null
          category: string | null
          client_id: string | null
          created_at: string
          deleted_at: string | null
          display_name: string
          document_code: string | null
          document_date: string | null
          expiry_date: string | null
          file_group_key: string
          file_name: string | null
          file_size_bytes: number | null
          id: string
          mime_type: string | null
          notes: string | null
          rejection_reason: string | null
          required_document_id: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          sharepoint_drive_id: string | null
          sharepoint_item_id: string | null
          sharepoint_web_url: string | null
          status: Database["files"]["Enums"]["document_status"]
          supersedes: string | null
          uploaded_by_client: boolean
          uploaded_by_staff: string | null
          version_number: number
        }
        Insert: {
          case_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name: string
          document_code?: string | null
          document_date?: string | null
          expiry_date?: string | null
          file_group_key?: string
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          rejection_reason?: string | null
          required_document_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sharepoint_drive_id?: string | null
          sharepoint_item_id?: string | null
          sharepoint_web_url?: string | null
          status?: Database["files"]["Enums"]["document_status"]
          supersedes?: string | null
          uploaded_by_client?: boolean
          uploaded_by_staff?: string | null
          version_number?: number
        }
        Update: {
          case_id?: string | null
          category?: string | null
          client_id?: string | null
          created_at?: string
          deleted_at?: string | null
          display_name?: string
          document_code?: string | null
          document_date?: string | null
          expiry_date?: string | null
          file_group_key?: string
          file_name?: string | null
          file_size_bytes?: number | null
          id?: string
          mime_type?: string | null
          notes?: string | null
          rejection_reason?: string | null
          required_document_id?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          sharepoint_drive_id?: string | null
          sharepoint_item_id?: string | null
          sharepoint_web_url?: string | null
          status?: Database["files"]["Enums"]["document_status"]
          supersedes?: string | null
          uploaded_by_client?: boolean
          uploaded_by_staff?: string | null
          version_number?: number
        }
        Relationships: [
          {
            foreignKeyName: "documents_supersedes_fkey"
            columns: ["supersedes"]
            isOneToOne: false
            referencedRelation: "documents"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      document_status:
        | "requested"
        | "uploaded"
        | "under_review"
        | "accepted"
        | "rejected"
        | "superseded"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  portal: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  ref: {
    Tables: {
      checklist_groups: {
        Row: {
          code: string
          created_at: string
          created_by: string | null
          description: string | null
          display_order: number
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          created_by?: string | null
          description?: string | null
          display_order?: number
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      countries: {
        Row: {
          code: string
          created_at: string
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      document_categories: {
        Row: {
          code: string
          display_order: number
          name: string
        }
        Insert: {
          code: string
          display_order?: number
          name: string
        }
        Update: {
          code?: string
          display_order?: number
          name?: string
        }
        Relationships: []
      }
      service_categories: {
        Row: {
          code: string
          created_at: string
          description: string | null
          display_order: number
          is_active: boolean
          name: string
        }
        Insert: {
          code: string
          created_at?: string
          description?: string | null
          display_order?: number
          is_active?: boolean
          name: string
        }
        Update: {
          code?: string
          created_at?: string
          description?: string | null
          display_order?: number
          is_active?: boolean
          name?: string
        }
        Relationships: []
      }
      service_templates: {
        Row: {
          created_at: string
          created_by: string | null
          description: string | null
          effective_from: string
          effective_to: string | null
          id: string
          notes: string | null
          required_intake_sections: Json
          service_type_id: string
          version: number
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_from: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          required_intake_sections?: Json
          service_type_id: string
          version: number
        }
        Update: {
          created_at?: string
          created_by?: string | null
          description?: string | null
          effective_from?: string
          effective_to?: string | null
          id?: string
          notes?: string | null
          required_intake_sections?: Json
          service_type_id?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "service_templates_service_type_id_fkey"
            columns: ["service_type_id"]
            isOneToOne: false
            referencedRelation: "service_types"
            referencedColumns: ["id"]
          },
        ]
      }
      service_types: {
        Row: {
          category_code: string
          code: string
          created_at: string
          created_by: string | null
          deactivated_at: string | null
          deactivated_by: string | null
          deactivation_reason: string | null
          description: string | null
          display_order: number
          id: string
          name: string
          scheduled_deactivation_at: string | null
          sub_category: string | null
          typical_duration_days: number | null
        }
        Insert: {
          category_code: string
          code: string
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          description?: string | null
          display_order?: number
          id?: string
          name: string
          scheduled_deactivation_at?: string | null
          sub_category?: string | null
          typical_duration_days?: number | null
        }
        Update: {
          category_code?: string
          code?: string
          created_at?: string
          created_by?: string | null
          deactivated_at?: string | null
          deactivated_by?: string | null
          deactivation_reason?: string | null
          description?: string | null
          display_order?: number
          id?: string
          name?: string
          scheduled_deactivation_at?: string | null
          sub_category?: string | null
          typical_duration_days?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "service_types_category_code_fkey"
            columns: ["category_code"]
            isOneToOne: false
            referencedRelation: "service_categories"
            referencedColumns: ["code"]
          },
        ]
      }
      template_documents: {
        Row: {
          allowed_file_types: string[] | null
          condition_label: string | null
          display_order: number
          document_code: string
          document_label: string
          expected_quantity: number
          group_code: string
          id: string
          instructions: string | null
          max_file_size_mb: number | null
          notes: string | null
          service_template_id: string
        }
        Insert: {
          allowed_file_types?: string[] | null
          condition_label?: string | null
          display_order?: number
          document_code: string
          document_label: string
          expected_quantity?: number
          group_code: string
          id?: string
          instructions?: string | null
          max_file_size_mb?: number | null
          notes?: string | null
          service_template_id: string
        }
        Update: {
          allowed_file_types?: string[] | null
          condition_label?: string | null
          display_order?: number
          document_code?: string
          document_label?: string
          expected_quantity?: number
          group_code?: string
          id?: string
          instructions?: string | null
          max_file_size_mb?: number | null
          notes?: string | null
          service_template_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "template_documents_group_code_fkey"
            columns: ["group_code"]
            isOneToOne: false
            referencedRelation: "checklist_groups"
            referencedColumns: ["code"]
          },
          {
            foreignKeyName: "template_documents_service_template_id_fkey"
            columns: ["service_template_id"]
            isOneToOne: false
            referencedRelation: "service_templates"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      active_template_for_variant: {
        Args: { p_service_type_id: string }
        Returns: string
      }
      is_variant_active: { Args: { p_id: string }; Returns: boolean }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  audit: {
    Enums: {},
  },
  crm: {
    Enums: {
      appointment_booking_source: ["staff", "public_portal", "manual_import"],
      appointment_status: [
        "confirmed",
        "rescheduled",
        "cancelled",
        "completed",
        "no_show",
        "pending_payment",
        "awaiting_review",
      ],
      biometrics_status: [
        "not_applicable",
        "previously_given_valid",
        "previously_given_expired",
        "pending",
        "requested_by_ircc",
        "scheduled",
        "completed",
        "exempt",
      ],
      case_status: [
        "retainer_pending",
        "documentation_in_progress",
        "documentation_review",
        "submitted_to_ircc",
        "passport_requested",
        "refused",
        "closed",
      ],
      client_status: ["lead", "active", "dormant", "closed"],
      communication_channel: [
        "email",
        "phone_call",
        "whatsapp",
        "sms",
        "in_person",
        "instagram",
        "facebook_messenger",
        "portal_message",
        "letter",
        "other",
      ],
      communication_direction: ["inbound", "outbound"],
      event_type: [
        "status_changed",
        "note_added",
        "document_received",
        "document_requested",
        "document_accepted",
        "document_rejected",
        "communication_sent",
        "communication_received",
        "fee_quoted",
        "fee_collected",
        "fee_refunded",
        "deadline_set",
        "deadline_met",
        "deadline_missed",
        "phase_advance_attempted",
        "phase_advance_blocked",
        "ircc_update",
        "correction",
        "other",
        "retainer_prepared",
        "retainer_sent",
        "retainer_signed",
        "retainer_voided",
        "retainer_uploaded",
        "retainer_resent",
        "biometrics_requested",
        "biometrics_scheduled",
        "biometrics_completed",
        "additional_info_requested",
        "additional_info_submitted",
        "interview_scheduled",
        "interview_completed",
        "application_returned",
        "appeal_filed",
        "withdrawal_requested",
        "additional_documents_requested",
        "document_viewed",
      ],
      gender: ["male", "female", "other", "prefer_not_to_say"],
      invoice_status: ["draft", "sent", "partial", "paid", "void", "overdue"],
      marital_status: [
        "single",
        "married",
        "common_law",
        "divorced",
        "widowed",
        "separated",
        "annulled",
      ],
      participant_role: [
        "principal",
        "spouse",
        "dependent_child",
        "co_applicant",
        "sponsor",
      ],
      payment_method: [
        "e_transfer",
        "stripe",
        "bank_transfer",
        "cash",
        "cheque",
        "wire",
        "other",
      ],
      relationship_type: [
        "father",
        "mother",
        "spouse",
        "common_law_partner",
        "son",
        "daughter",
        "step_son",
        "step_daughter",
        "adopted_son",
        "adopted_daughter",
        "brother",
        "sister",
        "half_brother",
        "half_sister",
        "step_brother",
        "step_sister",
        "guardian",
        "other",
      ],
      retainer_agreement_status: [
        "draft",
        "pending_signature",
        "signed",
        "uploaded",
        "void",
        "expired",
      ],
      retainer_method: [
        "online_signature",
        "signature_image_overlay",
        "scanned_upload",
      ],
      staff_role: [
        "admin",
        "rcic",
        "paralegal",
        "staff",
        "readonly",
        "super_user",
        "document_officer",
        "reception",
      ],
      task_status: ["open", "in_progress", "blocked", "done", "cancelled"],
      task_type: [
        "document_collection",
        "form_completion",
        "review_required",
        "submission",
        "biometrics_appointment",
        "medical_exam",
        "ircc_response",
        "follow_up_client",
        "permit_expiry_alert",
        "language_test_expiry",
        "eca_expiry",
        "custom",
      ],
    },
  },
  files: {
    Enums: {
      document_status: [
        "requested",
        "uploaded",
        "under_review",
        "accepted",
        "rejected",
        "superseded",
      ],
    },
  },
  portal: {
    Enums: {},
  },
  ref: {
    Enums: {},
  },
} as const

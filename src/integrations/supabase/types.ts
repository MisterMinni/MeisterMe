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
  public: {
    Tables: {
      absences: {
        Row: {
          attachment_url: string | null
          created_at: string
          days_calculated: number | null
          end_date: string
          id: string
          note: string | null
          review_comment: string | null
          reviewed_at: string | null
          reviewed_by: string | null
          start_date: string
          status: string
          substitute_user_id: string | null
          tenant_id: string
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          attachment_url?: string | null
          created_at?: string
          days_calculated?: number | null
          end_date: string
          id?: string
          note?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date: string
          status?: string
          substitute_user_id?: string | null
          tenant_id: string
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          attachment_url?: string | null
          created_at?: string
          days_calculated?: number | null
          end_date?: string
          id?: string
          note?: string | null
          review_comment?: string | null
          reviewed_at?: string | null
          reviewed_by?: string | null
          start_date?: string
          status?: string
          substitute_user_id?: string | null
          tenant_id?: string
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "absences_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_runs: {
        Row: {
          completion_tokens: number | null
          created_at: string
          error_code: string | null
          id: string
          input_metadata: Json
          model: string | null
          output_metadata: Json
          prompt_tokens: number | null
          provider: string | null
          status: string
          tenant_id: string
          tool: string
          user_id: string
        }
        Insert: {
          completion_tokens?: number | null
          created_at?: string
          error_code?: string | null
          id?: string
          input_metadata?: Json
          model?: string | null
          output_metadata?: Json
          prompt_tokens?: number | null
          provider?: string | null
          status: string
          tenant_id: string
          tool: string
          user_id: string
        }
        Update: {
          completion_tokens?: number | null
          created_at?: string
          error_code?: string | null
          id?: string
          input_metadata?: Json
          model?: string | null
          output_metadata?: Json
          prompt_tokens?: number | null
          provider?: string | null
          status?: string
          tenant_id?: string
          tool?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "ai_runs_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json | null
          tenant_id: string
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          tenant_id: string
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_log_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          body_template: string
          channel: string
          conditions: Json
          created_at: string
          created_by: string
          enabled: boolean
          id: string
          name: string
          subject_template: string | null
          tenant_id: string
          trigger_event: string
          updated_at: string
        }
        Insert: {
          body_template: string
          channel: string
          conditions?: Json
          created_at?: string
          created_by: string
          enabled?: boolean
          id?: string
          name: string
          subject_template?: string | null
          tenant_id: string
          trigger_event: string
          updated_at?: string
        }
        Update: {
          body_template?: string
          channel?: string
          conditions?: Json
          created_at?: string
          created_by?: string
          enabled?: boolean
          id?: string
          name?: string
          subject_template?: string | null
          tenant_id?: string
          trigger_event?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          attachments: Json
          body: string | null
          channel: string
          created_at: string
          created_by: string | null
          customer_id: string
          direction: string
          error_message: string | null
          id: string
          provider_message_id: string | null
          recipients: Json
          scheduled_at: string | null
          sent_at: string | null
          site_id: string | null
          status: string
          subject: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json
          body?: string | null
          channel: string
          created_at?: string
          created_by?: string | null
          customer_id: string
          direction?: string
          error_message?: string | null
          id?: string
          provider_message_id?: string | null
          recipients?: Json
          scheduled_at?: string | null
          sent_at?: string | null
          site_id?: string | null
          status?: string
          subject?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json
          body?: string | null
          channel?: string
          created_at?: string
          created_by?: string | null
          customer_id?: string
          direction?: string
          error_message?: string | null
          id?: string
          provider_message_id?: string | null
          recipients?: Json
          scheduled_at?: string | null
          sent_at?: string | null
          site_id?: string | null
          status?: string
          subject?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_customer_tenant_fkey"
            columns: ["customer_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "communications_site_tenant_fkey"
            columns: ["site_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "communications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_contacts: {
        Row: {
          created_at: string
          customer_id: string
          email: string | null
          full_name: string
          id: string
          is_primary: boolean
          phone: string | null
          role: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          customer_id: string
          email?: string | null
          full_name: string
          id?: string
          is_primary?: boolean
          phone?: string | null
          role?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          customer_id?: string
          email?: string | null
          full_name?: string
          id?: string
          is_primary?: boolean
          phone?: string | null
          role?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_contacts_customer_tenant_fkey"
            columns: ["customer_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "customer_contacts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          billing_address: Json
          company_name: string | null
          created_at: string
          created_by: string | null
          customer_number: string | null
          email: string | null
          first_name: string | null
          id: string
          kind: string
          last_name: string | null
          mobile: string | null
          notes: string | null
          phone: string | null
          site_address: Json
          source: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          billing_address?: Json
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_number?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          kind?: string
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          site_address?: Json
          source?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          billing_address?: Json
          company_name?: string | null
          created_at?: string
          created_by?: string | null
          customer_number?: string | null
          email?: string | null
          first_name?: string | null
          id?: string
          kind?: string
          last_name?: string | null
          mobile?: string | null
          notes?: string | null
          phone?: string | null
          site_address?: Json
          source?: string | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "customers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      documents: {
        Row: {
          created_at: string
          customer_id: string | null
          id: string
          kind: string | null
          name: string
          project_id: string | null
          tenant_id: string
          url: string
        }
        Insert: {
          created_at?: string
          customer_id?: string | null
          id?: string
          kind?: string | null
          name: string
          project_id?: string | null
          tenant_id: string
          url: string
        }
        Update: {
          created_at?: string
          customer_id?: string | null
          id?: string
          kind?: string | null
          name?: string
          project_id?: string | null
          tenant_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_documents: {
        Row: {
          created_at: string
          id: string
          kind: string | null
          name: string
          storage_path: string
          tenant_id: string
          uploaded_by: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string | null
          name: string
          storage_path: string
          tenant_id: string
          uploaded_by?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string | null
          name?: string
          storage_path?: string
          tenant_id?: string
          uploaded_by?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_documents_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      employee_qualifications: {
        Row: {
          acquired_on: string | null
          document_url: string | null
          expires_on: string | null
          qualification_id: string
          user_id: string
        }
        Insert: {
          acquired_on?: string | null
          document_url?: string | null
          expires_on?: string | null
          qualification_id: string
          user_id: string
        }
        Update: {
          acquired_on?: string | null
          document_url?: string | null
          expires_on?: string | null
          qualification_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "employee_qualifications_qualification_id_fkey"
            columns: ["qualification_id"]
            isOneToOne: false
            referencedRelation: "qualifications"
            referencedColumns: ["id"]
          },
        ]
      }
      equipment: {
        Row: {
          assigned_to: string | null
          created_at: string
          handed_out_on: string | null
          id: string
          identifier: string | null
          name: string
          returned_on: string | null
          tenant_id: string
          type: string
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string
          handed_out_on?: string | null
          id?: string
          identifier?: string | null
          name: string
          returned_on?: string | null
          tenant_id: string
          type: string
        }
        Update: {
          assigned_to?: string | null
          created_at?: string
          handed_out_on?: string | null
          id?: string
          identifier?: string | null
          name?: string
          returned_on?: string | null
          tenant_id?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "equipment_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string
          description: string
          discount_percent: number
          id: string
          invoice_id: string
          position: number
          quantity: number
          tenant_id: string
          total: number | null
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          discount_percent?: number
          id?: string
          invoice_id: string
          position: number
          quantity?: number
          tenant_id: string
          total?: number | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          invoice_id?: string
          position?: number
          quantity?: number
          tenant_id?: string
          total?: number | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_tenant_fkey"
            columns: ["invoice_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "invoice_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string
          created_by: string
          customer_id: string
          due_date: string | null
          gross_amount: number
          id: string
          invoice_date: string
          invoice_number: string
          issued_at: string | null
          net_amount: number
          offer_id: string | null
          paid_amount: number
          paid_at: string | null
          site_id: string | null
          status: string
          subject: string
          tax_amount: number
          tax_rate: number
          tenant_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          customer_id: string
          due_date?: string | null
          gross_amount?: number
          id?: string
          invoice_date?: string
          invoice_number: string
          issued_at?: string | null
          net_amount?: number
          offer_id?: string | null
          paid_amount?: number
          paid_at?: string | null
          site_id?: string | null
          status?: string
          subject: string
          tax_amount?: number
          tax_rate?: number
          tenant_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          customer_id?: string
          due_date?: string | null
          gross_amount?: number
          id?: string
          invoice_date?: string
          invoice_number?: string
          issued_at?: string | null
          net_amount?: number
          offer_id?: string | null
          paid_amount?: number
          paid_at?: string | null
          site_id?: string | null
          status?: string
          subject?: string
          tax_amount?: number
          tax_rate?: number
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoices_customer_tenant_fkey"
            columns: ["customer_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "invoices_offer_tenant_fkey"
            columns: ["offer_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "invoices_site_tenant_fkey"
            columns: ["site_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "invoices_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          active: boolean
          category: string | null
          created_at: string
          id: string
          name: string
          purchase_price: number
          sales_price: number
          sku: string | null
          supplier: string | null
          tenant_id: string
          trade: Database["public"]["Enums"]["gewerk"] | null
          unit: string
          updated_at: string
          waste_percent: number
        }
        Insert: {
          active?: boolean
          category?: string | null
          created_at?: string
          id?: string
          name: string
          purchase_price?: number
          sales_price?: number
          sku?: string | null
          supplier?: string | null
          tenant_id: string
          trade?: Database["public"]["Enums"]["gewerk"] | null
          unit?: string
          updated_at?: string
          waste_percent?: number
        }
        Update: {
          active?: boolean
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          purchase_price?: number
          sales_price?: number
          sku?: string | null
          supplier?: string | null
          tenant_id?: string
          trade?: Database["public"]["Enums"]["gewerk"] | null
          unit?: string
          updated_at?: string
          waste_percent?: number
        }
        Relationships: [
          {
            foreignKeyName: "materials_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      measurement_items: {
        Row: {
          area: string | null
          created_at: string
          deduction: number
          description: string
          height: number | null
          id: string
          length: number | null
          measurement_id: string
          metadata: Json
          position: number
          quantity: number
          source: string
          tenant_id: string
          unit: string
          updated_at: string
          width: number | null
        }
        Insert: {
          area?: string | null
          created_at?: string
          deduction?: number
          description: string
          height?: number | null
          id?: string
          length?: number | null
          measurement_id: string
          metadata?: Json
          position?: number
          quantity?: number
          source?: string
          tenant_id: string
          unit?: string
          updated_at?: string
          width?: number | null
        }
        Update: {
          area?: string | null
          created_at?: string
          deduction?: number
          description?: string
          height?: number | null
          id?: string
          length?: number | null
          measurement_id?: string
          metadata?: Json
          position?: number
          quantity?: number
          source?: string
          tenant_id?: string
          unit?: string
          updated_at?: string
          width?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "measurement_items_measurement_tenant_fkey"
            columns: ["measurement_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "measurement_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      measurements: {
        Row: {
          ai_summary: string | null
          captured_at: string
          created_at: string
          created_by: string
          customer_id: string | null
          id: string
          notes: string | null
          site_id: string | null
          status: string
          tenant_id: string
          title: string
          totals: Json
          updated_at: string
        }
        Insert: {
          ai_summary?: string | null
          captured_at?: string
          created_at?: string
          created_by: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          site_id?: string | null
          status?: string
          tenant_id: string
          title: string
          totals?: Json
          updated_at?: string
        }
        Update: {
          ai_summary?: string | null
          captured_at?: string
          created_at?: string
          created_by?: string
          customer_id?: string | null
          id?: string
          notes?: string | null
          site_id?: string | null
          status?: string
          tenant_id?: string
          title?: string
          totals?: Json
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "measurements_customer_tenant_fkey"
            columns: ["customer_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "measurements_site_tenant_fkey"
            columns: ["site_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "measurements_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          tenant_id: string
          title: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          tenant_id?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offer_items: {
        Row: {
          created_at: string
          description: string
          discount_percent: number
          id: string
          kind: string
          offer_id: string
          position: number
          quantity: number
          source: string
          tenant_id: string
          total: number | null
          unit: string
          unit_price: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          description: string
          discount_percent?: number
          id?: string
          kind?: string
          offer_id: string
          position: number
          quantity?: number
          source?: string
          tenant_id: string
          total?: number | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string
          discount_percent?: number
          id?: string
          kind?: string
          offer_id?: string
          position?: number
          quantity?: number
          source?: string
          tenant_id?: string
          total?: number | null
          unit?: string
          unit_price?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offer_items_offer_tenant_fkey"
            columns: ["offer_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "offers"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "offer_items_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      offers: {
        Row: {
          accepted_at: string | null
          ai_generated: boolean
          closing_text: string | null
          created_at: string
          created_by: string
          customer_id: string
          gross_amount: number
          id: string
          introduction: string | null
          measurement_id: string | null
          net_amount: number
          offer_number: string
          sent_at: string | null
          site_id: string | null
          status: string
          subject: string
          tax_amount: number
          tax_rate: number
          tenant_id: string
          updated_at: string
          valid_until: string | null
        }
        Insert: {
          accepted_at?: string | null
          ai_generated?: boolean
          closing_text?: string | null
          created_at?: string
          created_by: string
          customer_id: string
          gross_amount?: number
          id?: string
          introduction?: string | null
          measurement_id?: string | null
          net_amount?: number
          offer_number: string
          sent_at?: string | null
          site_id?: string | null
          status?: string
          subject: string
          tax_amount?: number
          tax_rate?: number
          tenant_id: string
          updated_at?: string
          valid_until?: string | null
        }
        Update: {
          accepted_at?: string | null
          ai_generated?: boolean
          closing_text?: string | null
          created_at?: string
          created_by?: string
          customer_id?: string
          gross_amount?: number
          id?: string
          introduction?: string | null
          measurement_id?: string | null
          net_amount?: number
          offer_number?: string
          sent_at?: string | null
          site_id?: string | null
          status?: string
          subject?: string
          tax_amount?: number
          tax_rate?: number
          tenant_id?: string
          updated_at?: string
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "offers_customer_tenant_fkey"
            columns: ["customer_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "offers_measurement_tenant_fkey"
            columns: ["measurement_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "measurements"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "offers_site_tenant_fkey"
            columns: ["site_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id", "tenant_id"]
          },
          {
            foreignKeyName: "offers_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          description: string
          key: string
          resource: string
        }
        Insert: {
          action: string
          description: string
          key: string
          resource: string
        }
        Update: {
          action?: string
          description?: string
          key?: string
          resource?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          address: string | null
          avatar_url: string | null
          cost_center: string | null
          created_at: string
          disabled_at: string | null
          employee_number: string | null
          entry_date: string | null
          exit_date: string | null
          full_name: string | null
          id: string
          phone: string | null
          state_code: string | null
          subgroup: string | null
          tenant_id: string | null
          vacation_days_per_year: number | null
          weekly_hours: number | null
          work_time_model: string | null
        }
        Insert: {
          address?: string | null
          avatar_url?: string | null
          cost_center?: string | null
          created_at?: string
          disabled_at?: string | null
          employee_number?: string | null
          entry_date?: string | null
          exit_date?: string | null
          full_name?: string | null
          id: string
          phone?: string | null
          state_code?: string | null
          subgroup?: string | null
          tenant_id?: string | null
          vacation_days_per_year?: number | null
          weekly_hours?: number | null
          work_time_model?: string | null
        }
        Update: {
          address?: string | null
          avatar_url?: string | null
          cost_center?: string | null
          created_at?: string
          disabled_at?: string | null
          employee_number?: string | null
          entry_date?: string | null
          exit_date?: string | null
          full_name?: string | null
          id?: string
          phone?: string | null
          state_code?: string | null
          subgroup?: string | null
          tenant_id?: string | null
          vacation_days_per_year?: number | null
          weekly_hours?: number | null
          work_time_model?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      project_messages: {
        Row: {
          body: string | null
          created_at: string
          id: string
          image_url: string | null
          project_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          project_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          body?: string | null
          created_at?: string
          id?: string
          image_url?: string | null
          project_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "project_messages_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "project_messages_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      qualifications: {
        Row: {
          category: string | null
          created_at: string
          id: string
          name: string
          tenant_id: string
        }
        Insert: {
          category?: string | null
          created_at?: string
          id?: string
          name: string
          tenant_id: string
        }
        Update: {
          category?: string | null
          created_at?: string
          id?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "qualifications_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      role_permissions: {
        Row: {
          permission_key: string
          role_id: string
        }
        Insert: {
          permission_key: string
          role_id: string
        }
        Update: {
          permission_key?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_permission_key_fkey"
            columns: ["permission_key"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["key"]
          },
          {
            foreignKeyName: "role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
        ]
      }
      roles: {
        Row: {
          created_at: string
          description: string | null
          id: string
          is_system: boolean
          key: string
          name: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key: string
          name: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          is_system?: boolean
          key?: string
          name?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "roles_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      site_members: {
        Row: {
          added_at: string
          role_on_site: string | null
          site_id: string
          user_id: string
        }
        Insert: {
          added_at?: string
          role_on_site?: string | null
          site_id: string
          user_id: string
        }
        Update: {
          added_at?: string
          role_on_site?: string | null
          site_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "site_members_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
        ]
      }
      sites: {
        Row: {
          adresse: string | null
          archived_at: string | null
          beschreibung: string | null
          budget: number | null
          color: string
          created_at: string
          customer_id: string | null
          end_date: string | null
          end_datum: string | null
          gewerk: Database["public"]["Enums"]["gewerk"] | null
          id: string
          image_url: string | null
          name: string
          start_date: string | null
          start_datum: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          archived_at?: string | null
          beschreibung?: string | null
          budget?: number | null
          color?: string
          created_at?: string
          customer_id?: string | null
          end_date?: string | null
          end_datum?: string | null
          gewerk?: Database["public"]["Enums"]["gewerk"] | null
          id?: string
          image_url?: string | null
          name: string
          start_date?: string | null
          start_datum?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          archived_at?: string | null
          beschreibung?: string | null
          budget?: number | null
          color?: string
          created_at?: string
          customer_id?: string | null
          end_date?: string | null
          end_datum?: string | null
          gewerk?: Database["public"]["Enums"]["gewerk"] | null
          id?: string
          image_url?: string | null
          name?: string
          start_date?: string | null
          start_datum?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sites_customer_tenant_fkey"
            columns: ["customer_id", "tenant_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id", "tenant_id"]
          },
        ]
      }
      tasks: {
        Row: {
          assignee_id: string | null
          created_at: string
          faellig_am: string | null
          id: string
          prioritaet: string | null
          project_id: string | null
          status: Database["public"]["Enums"]["task_status"] | null
          tenant_id: string
          title: string
        }
        Insert: {
          assignee_id?: string | null
          created_at?: string
          faellig_am?: string | null
          id?: string
          prioritaet?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          tenant_id: string
          title: string
        }
        Update: {
          assignee_id?: string | null
          created_at?: string
          faellig_am?: string | null
          id?: string
          prioritaet?: string | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["task_status"] | null
          tenant_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "tasks_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "tasks_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenant_sso_domains: {
        Row: {
          created_at: string
          domain: string
          id: string
          tenant_id: string
        }
        Insert: {
          created_at?: string
          domain: string
          id?: string
          tenant_id: string
        }
        Update: {
          created_at?: string
          domain?: string
          id?: string
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "tenant_sso_domains_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      tenants: {
        Row: {
          adresse: string | null
          created_at: string
          email: string | null
          gewerk_default: Database["public"]["Enums"]["gewerk"] | null
          id: string
          logo_url: string | null
          name: string
          ort: string | null
          plz: string | null
          telefon: string | null
          ustid: string | null
        }
        Insert: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          gewerk_default?: Database["public"]["Enums"]["gewerk"] | null
          id?: string
          logo_url?: string | null
          name: string
          ort?: string | null
          plz?: string | null
          telefon?: string | null
          ustid?: string | null
        }
        Update: {
          adresse?: string | null
          created_at?: string
          email?: string | null
          gewerk_default?: Database["public"]["Enums"]["gewerk"] | null
          id?: string
          logo_url?: string | null
          name?: string
          ort?: string | null
          plz?: string | null
          telefon?: string | null
          ustid?: string | null
        }
        Relationships: []
      }
      time_entries: {
        Row: {
          activity_type: string
          ai_report: string | null
          approved_at: string | null
          approved_by: string | null
          created_at: string
          end_ts: string | null
          fahrt_min: number | null
          id: string
          minuten: number | null
          notiz: string | null
          pause_min: number | null
          pause_seconds: number
          photos: string[]
          project_id: string | null
          report_text: string | null
          start_ts: string | null
          status: string
          taetigkeit: string | null
          tenant_id: string
          user_id: string
          voice_note_url: string | null
        }
        Insert: {
          activity_type?: string
          ai_report?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_ts?: string | null
          fahrt_min?: number | null
          id?: string
          minuten?: number | null
          notiz?: string | null
          pause_min?: number | null
          pause_seconds?: number
          photos?: string[]
          project_id?: string | null
          report_text?: string | null
          start_ts?: string | null
          status?: string
          taetigkeit?: string | null
          tenant_id: string
          user_id: string
          voice_note_url?: string | null
        }
        Update: {
          activity_type?: string
          ai_report?: string | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string
          end_ts?: string | null
          fahrt_min?: number | null
          id?: string
          minuten?: number | null
          notiz?: string | null
          pause_min?: number | null
          pause_seconds?: number
          photos?: string[]
          project_id?: string | null
          report_text?: string | null
          start_ts?: string | null
          status?: string
          taetigkeit?: string | null
          tenant_id?: string
          user_id?: string
          voice_note_url?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "time_entries_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      user_role_assignments: {
        Row: {
          assigned_at: string
          role_id: string
          tenant_id: string
          user_id: string
        }
        Insert: {
          assigned_at?: string
          role_id: string
          tenant_id: string
          user_id: string
        }
        Update: {
          assigned_at?: string
          role_id?: string
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_role_assignments_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "roles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_role_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      weekly_assignments: {
        Row: {
          activity_type: string | null
          created_at: string
          created_by: string
          day: string
          end_time: string | null
          id: string
          note: string | null
          site_id: string | null
          start_time: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          activity_type?: string | null
          created_at?: string
          created_by: string
          day: string
          end_time?: string | null
          id?: string
          note?: string | null
          site_id?: string | null
          start_time?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          activity_type?: string | null
          created_at?: string
          created_by?: string
          day?: string
          end_time?: string | null
          id?: string
          note?: string | null
          site_id?: string | null
          start_time?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "weekly_assignments_site_id_fkey"
            columns: ["site_id"]
            isOneToOne: false
            referencedRelation: "sites"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "weekly_assignments_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      current_tenant_id: { Args: never; Returns: string }
      has_permission: {
        Args: { _permission: string; _user_id: string }
        Returns: boolean
      }
      is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean }
      seed_default_roles: { Args: { _tenant_id: string }; Returns: undefined }
    }
    Enums: {
      gewerk:
        | "stuckateur"
        | "maler"
        | "trockenbauer"
        | "dachdecker"
        | "schreiner"
        | "shk"
        | "elektriker"
        | "galabau"
        | "ausbau"
        | "sonstige"
      invoice_status: "entwurf" | "freigegeben" | "gestellt"
      project_status:
        | "anfrage"
        | "angebot"
        | "beauftragt"
        | "geplant"
        | "in_arbeit"
        | "abgeschlossen"
        | "abgerechnet"
      task_status: "offen" | "in_arbeit" | "erledigt"
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
  public: {
    Enums: {
      gewerk: [
        "stuckateur",
        "maler",
        "trockenbauer",
        "dachdecker",
        "schreiner",
        "shk",
        "elektriker",
        "galabau",
        "ausbau",
        "sonstige",
      ],
      invoice_status: ["entwurf", "freigegeben", "gestellt"],
      project_status: [
        "anfrage",
        "angebot",
        "beauftragt",
        "geplant",
        "in_arbeit",
        "abgeschlossen",
        "abgerechnet",
      ],
      task_status: ["offen", "in_arbeit", "erledigt"],
    },
  },
} as const

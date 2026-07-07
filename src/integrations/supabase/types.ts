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
      calculations: {
        Row: {
          created_at: string
          deckungsbeitrag: number | null
          gewinn_zuschlag: number | null
          gk_zuschlag: number | null
          id: string
          lohn_kosten: number | null
          material_kosten: number | null
          project_id: string | null
          stundensatz: number | null
          tenant_id: string
          vk_preis: number | null
        }
        Insert: {
          created_at?: string
          deckungsbeitrag?: number | null
          gewinn_zuschlag?: number | null
          gk_zuschlag?: number | null
          id?: string
          lohn_kosten?: number | null
          material_kosten?: number | null
          project_id?: string | null
          stundensatz?: number | null
          tenant_id: string
          vk_preis?: number | null
        }
        Update: {
          created_at?: string
          deckungsbeitrag?: number | null
          gewinn_zuschlag?: number | null
          gk_zuschlag?: number | null
          id?: string
          lohn_kosten?: number | null
          material_kosten?: number | null
          project_id?: string | null
          stundensatz?: number | null
          tenant_id?: string
          vk_preis?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "calculations_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "calculations_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      communications: {
        Row: {
          betreff: string | null
          body: string | null
          created_at: string
          customer_id: string | null
          id: string
          kanal: string | null
          project_id: string | null
          richtung: string | null
          tenant_id: string
        }
        Insert: {
          betreff?: string | null
          body?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          kanal?: string | null
          project_id?: string | null
          richtung?: string | null
          tenant_id: string
        }
        Update: {
          betreff?: string | null
          body?: string | null
          created_at?: string
          customer_id?: string | null
          id?: string
          kanal?: string | null
          project_id?: string | null
          richtung?: string | null
          tenant_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "communications_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "communications_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
      customers: {
        Row: {
          adresse: string | null
          ansprechpartner: string | null
          created_at: string
          email: string | null
          firma: string | null
          id: string
          notizen: string | null
          ort: string | null
          plz: string | null
          telefon: string | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          ansprechpartner?: string | null
          created_at?: string
          email?: string | null
          firma?: string | null
          id?: string
          notizen?: string | null
          ort?: string | null
          plz?: string | null
          telefon?: string | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          ansprechpartner?: string | null
          created_at?: string
          email?: string | null
          firma?: string | null
          id?: string
          notizen?: string | null
          ort?: string | null
          plz?: string | null
          telefon?: string | null
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
            foreignKeyName: "documents_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "documents_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      field_reports: {
        Row: {
          created_at: string
          datum: string | null
          end_zeit: string | null
          fahrt_min: number | null
          id: string
          ki_bericht: string | null
          kunden_zusammenfassung: string | null
          material: Json | null
          offene_punkte: string | null
          pause_min: number | null
          probleme: string | null
          project_id: string | null
          sprachnotiz: string | null
          start_zeit: string | null
          status: Database["public"]["Enums"]["report_status"] | null
          taetigkeit: string | null
          tenant_id: string
          unterschrift_url: string | null
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          datum?: string | null
          end_zeit?: string | null
          fahrt_min?: number | null
          id?: string
          ki_bericht?: string | null
          kunden_zusammenfassung?: string | null
          material?: Json | null
          offene_punkte?: string | null
          pause_min?: number | null
          probleme?: string | null
          project_id?: string | null
          sprachnotiz?: string | null
          start_zeit?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          taetigkeit?: string | null
          tenant_id: string
          unterschrift_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          datum?: string | null
          end_zeit?: string | null
          fahrt_min?: number | null
          id?: string
          ki_bericht?: string | null
          kunden_zusammenfassung?: string | null
          material?: Json | null
          offene_punkte?: string | null
          pause_min?: number | null
          probleme?: string | null
          project_id?: string | null
          sprachnotiz?: string | null
          start_zeit?: string | null
          status?: Database["public"]["Enums"]["report_status"] | null
          taetigkeit?: string | null
          tenant_id?: string
          unterschrift_url?: string | null
          updated_at?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "field_reports_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "field_reports_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_drafts: {
        Row: {
          brutto: number | null
          created_at: string
          customer_id: string | null
          id: string
          mwst_satz: number | null
          netto: number | null
          notiz: string | null
          positionen: Json | null
          project_id: string | null
          status: Database["public"]["Enums"]["invoice_status"] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          brutto?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          mwst_satz?: number | null
          netto?: number | null
          notiz?: string | null
          positionen?: Json | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          brutto?: number | null
          created_at?: string
          customer_id?: string | null
          id?: string
          mwst_satz?: number | null
          netto?: number | null
          notiz?: string | null
          positionen?: Json | null
          project_id?: string | null
          status?: Database["public"]["Enums"]["invoice_status"] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invoice_drafts_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_drafts_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoice_drafts_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      materials: {
        Row: {
          artikelnummer: string | null
          bezeichnung: string
          created_at: string
          einheit: string | null
          ek_preis: number | null
          id: string
          lagerbestand: number | null
          lieferant: string | null
          tenant_id: string
          vk_preis: number | null
        }
        Insert: {
          artikelnummer?: string | null
          bezeichnung: string
          created_at?: string
          einheit?: string | null
          ek_preis?: number | null
          id?: string
          lagerbestand?: number | null
          lieferant?: string | null
          tenant_id: string
          vk_preis?: number | null
        }
        Update: {
          artikelnummer?: string | null
          bezeichnung?: string
          created_at?: string
          einheit?: string | null
          ek_preis?: number | null
          id?: string
          lagerbestand?: number | null
          lieferant?: string | null
          tenant_id?: string
          vk_preis?: number | null
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
      measurements: {
        Row: {
          abzuege: Json | null
          bereich: string
          bodenflaeche: number | null
          breite: number | null
          created_at: string
          deckenflaeche: number | null
          hoehe: number | null
          id: string
          laenge: number | null
          notizen: string | null
          project_id: string
          tenant_id: string
          umfang: number | null
          wandflaeche: number | null
        }
        Insert: {
          abzuege?: Json | null
          bereich: string
          bodenflaeche?: number | null
          breite?: number | null
          created_at?: string
          deckenflaeche?: number | null
          hoehe?: number | null
          id?: string
          laenge?: number | null
          notizen?: string | null
          project_id: string
          tenant_id: string
          umfang?: number | null
          wandflaeche?: number | null
        }
        Update: {
          abzuege?: Json | null
          bereich?: string
          bodenflaeche?: number | null
          breite?: number | null
          created_at?: string
          deckenflaeche?: number | null
          hoehe?: number | null
          id?: string
          laenge?: number | null
          notizen?: string | null
          project_id?: string
          tenant_id?: string
          umfang?: number | null
          wandflaeche?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "measurements_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
      offers: {
        Row: {
          brutto: number | null
          created_at: string
          customer_id: string | null
          gueltig_bis: string | null
          id: string
          mwst_satz: number | null
          netto: number | null
          notiz: string | null
          nummer: string
          positionen: Json | null
          project_id: string | null
          rabatt: number | null
          status: Database["public"]["Enums"]["offer_status"] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          brutto?: number | null
          created_at?: string
          customer_id?: string | null
          gueltig_bis?: string | null
          id?: string
          mwst_satz?: number | null
          netto?: number | null
          notiz?: string | null
          nummer: string
          positionen?: Json | null
          project_id?: string | null
          rabatt?: number | null
          status?: Database["public"]["Enums"]["offer_status"] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          brutto?: number | null
          created_at?: string
          customer_id?: string | null
          gueltig_bis?: string | null
          id?: string
          mwst_satz?: number | null
          netto?: number | null
          notiz?: string | null
          nummer?: string
          positionen?: Json | null
          project_id?: string | null
          rabatt?: number | null
          status?: Database["public"]["Enums"]["offer_status"] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "offers_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "offers_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
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
      photos: {
        Row: {
          created_at: string
          id: string
          notiz: string | null
          project_id: string | null
          report_id: string | null
          tag: string | null
          tenant_id: string
          url: string
        }
        Insert: {
          created_at?: string
          id?: string
          notiz?: string | null
          project_id?: string | null
          report_id?: string | null
          tag?: string | null
          tenant_id: string
          url: string
        }
        Update: {
          created_at?: string
          id?: string
          notiz?: string | null
          project_id?: string | null
          report_id?: string | null
          tag?: string | null
          tenant_id?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "photos_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "field_reports"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "photos_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          full_name: string | null
          id: string
          phone: string | null
          tenant_id: string | null
        }
        Insert: {
          created_at?: string
          full_name?: string | null
          id: string
          phone?: string | null
          tenant_id?: string | null
        }
        Update: {
          created_at?: string
          full_name?: string | null
          id?: string
          phone?: string | null
          tenant_id?: string | null
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
      projects: {
        Row: {
          adresse: string | null
          beschreibung: string | null
          budget: number | null
          created_at: string
          customer_id: string | null
          end_datum: string | null
          gewerk: Database["public"]["Enums"]["gewerk"] | null
          id: string
          name: string
          start_datum: string | null
          status: Database["public"]["Enums"]["project_status"] | null
          tenant_id: string
          updated_at: string
        }
        Insert: {
          adresse?: string | null
          beschreibung?: string | null
          budget?: number | null
          created_at?: string
          customer_id?: string | null
          end_datum?: string | null
          gewerk?: Database["public"]["Enums"]["gewerk"] | null
          id?: string
          name: string
          start_datum?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          tenant_id: string
          updated_at?: string
        }
        Update: {
          adresse?: string | null
          beschreibung?: string | null
          budget?: number | null
          created_at?: string
          customer_id?: string | null
          end_datum?: string | null
          gewerk?: Database["public"]["Enums"]["gewerk"] | null
          id?: string
          name?: string
          start_datum?: string | null
          status?: Database["public"]["Enums"]["project_status"] | null
          tenant_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "projects_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "projects_tenant_id_fkey"
            columns: ["tenant_id"]
            isOneToOne: false
            referencedRelation: "tenants"
            referencedColumns: ["id"]
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
            referencedRelation: "projects"
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
          created_at: string
          end_ts: string | null
          fahrt_min: number | null
          id: string
          minuten: number | null
          notiz: string | null
          pause_min: number | null
          project_id: string | null
          start_ts: string | null
          taetigkeit: string | null
          tenant_id: string
          user_id: string
        }
        Insert: {
          created_at?: string
          end_ts?: string | null
          fahrt_min?: number | null
          id?: string
          minuten?: number | null
          notiz?: string | null
          pause_min?: number | null
          project_id?: string | null
          start_ts?: string | null
          taetigkeit?: string | null
          tenant_id: string
          user_id: string
        }
        Update: {
          created_at?: string
          end_ts?: string | null
          fahrt_min?: number | null
          id?: string
          minuten?: number | null
          notiz?: string | null
          pause_min?: number | null
          project_id?: string | null
          start_ts?: string | null
          taetigkeit?: string | null
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "time_entries_project_id_fkey"
            columns: ["project_id"]
            isOneToOne: false
            referencedRelation: "projects"
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
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          tenant_id: string
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          tenant_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_roles_tenant_id_fkey"
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
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_tenant_member: { Args: { _tenant_id: string }; Returns: boolean }
    }
    Enums: {
      app_role: "admin" | "buero" | "bauleiter" | "monteur" | "azubi"
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
      offer_status: "entwurf" | "gesendet" | "angenommen" | "abgelehnt"
      project_status:
        | "anfrage"
        | "angebot"
        | "beauftragt"
        | "geplant"
        | "in_arbeit"
        | "abgeschlossen"
        | "abgerechnet"
      report_status: "entwurf" | "fertig" | "geprueft"
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
      app_role: ["admin", "buero", "bauleiter", "monteur", "azubi"],
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
      offer_status: ["entwurf", "gesendet", "angenommen", "abgelehnt"],
      project_status: [
        "anfrage",
        "angebot",
        "beauftragt",
        "geplant",
        "in_arbeit",
        "abgeschlossen",
        "abgerechnet",
      ],
      report_status: ["entwurf", "fertig", "geprueft"],
      task_status: ["offen", "in_arbeit", "erledigt"],
    },
  },
} as const

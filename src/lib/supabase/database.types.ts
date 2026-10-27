
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "audit_events": {
                  Row: {
                    "action": string,"actor_id": string | null,"at": string,"changed": Json | null,"id": number,"org_id": string | null,"row_id": string | null,"subject_worker_id": string | null,"table_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "action": string,"actor_id"?: string | null,"at"?: string,"changed"?: Json | null,"id"?: never,"org_id"?: string | null,"row_id"?: string | null,"subject_worker_id"?: string | null,"table_name": string
                  }
                  Update: {
                    "action"?: string,"actor_id"?: string | null,"at"?: string,"changed"?: Json | null,"id"?: never,"org_id"?: string | null,"row_id"?: string | null,"subject_worker_id"?: string | null,"table_name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"consent_records": {
                  Row: {
                    "given_at": string,"id": string,"notice_version": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "given_at"?: string,"id"?: string,"notice_version": string,"user_id": string
                  }
                  Update: {
                    "given_at"?: string,"id"?: string,"notice_version"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "consent_records_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"dispute_events": {
                  Row: {
                    "actor_id": string | null,"actor_kind": string,"body": string | null,"created_at": string,"dispute_id": string,"from_status": Database["public"]['Enums']["dispute_status"] | null,"id": string,"to_status": Database["public"]['Enums']["dispute_status"] | null
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_kind": string,"body"?: string | null,"created_at"?: string,"dispute_id": string,"from_status"?: Database["public"]['Enums']["dispute_status"] | null,"id"?: string,"to_status"?: Database["public"]['Enums']["dispute_status"] | null
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_kind"?: string,"body"?: string | null,"created_at"?: string,"dispute_id"?: string,"from_status"?: Database["public"]['Enums']["dispute_status"] | null,"id"?: string,"to_status"?: Database["public"]['Enums']["dispute_status"] | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "dispute_events_dispute_id_fkey"
      columns: ["dispute_id"]
isOneToOne: false
      referencedRelation: "wage_disputes"
      referencedColumns: ["id"]
    }
                  ]
                },"evidence_documents": {
                  Row: {
                    "created_at": string,"deleted_at": string | null,"id": string,"kind": string,"mime_type": string,"org_id": string | null,"owner_id": string,"provenance": Database["public"]['Enums']["record_source"],"sha256": string,"size_bytes": number,"storage_path": string,"title": string,"verification": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"kind": string,"mime_type": string,"org_id"?: string | null,"owner_id": string,"provenance"?: Database["public"]['Enums']["record_source"],"sha256": string,"size_bytes": number,"storage_path": string,"title": string,"verification"?: string
                  }
                  Update: {
                    "created_at"?: string,"deleted_at"?: string | null,"id"?: string,"kind"?: string,"mime_type"?: string,"org_id"?: string | null,"owner_id"?: string,"provenance"?: Database["public"]['Enums']["record_source"],"sha256"?: string,"size_bytes"?: number,"storage_path"?: string,"title"?: string,"verification"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "evidence_documents_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "evidence_documents_owner_id_fkey"
      columns: ["owner_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"incident_attachments": {
                  Row: {
                    "created_at": string,"id": string,"incident_id": string,"mime_type": string,"sha256": string,"size_bytes": number,"storage_path": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"incident_id": string,"mime_type": string,"sha256": string,"size_bytes": number,"storage_path": string
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"incident_id"?: string,"mime_type"?: string,"sha256"?: string,"size_bytes"?: number,"storage_path"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "incident_attachments_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    }
                  ]
                },"incident_events": {
                  Row: {
                    "actor_id": string | null,"actor_kind": string,"body": string | null,"created_at": string,"from_status": Database["public"]['Enums']["incident_status"] | null,"id": string,"incident_id": string,"kind": string,"to_status": Database["public"]['Enums']["incident_status"] | null,"visible_to_reporter": boolean
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"actor_kind": string,"body"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["incident_status"] | null,"id"?: string,"incident_id": string,"kind": string,"to_status"?: Database["public"]['Enums']["incident_status"] | null,"visible_to_reporter"?: boolean
                  }
                  Update: {
                    "actor_id"?: string | null,"actor_kind"?: string,"body"?: string | null,"created_at"?: string,"from_status"?: Database["public"]['Enums']["incident_status"] | null,"id"?: string,"incident_id"?: string,"kind"?: string,"to_status"?: Database["public"]['Enums']["incident_status"] | null,"visible_to_reporter"?: boolean
                  }
                  Relationships: [
                    {
      foreignKeyName: "incident_events_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: false
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    }
                  ]
                },"incident_reporters": {
                  Row: {
                    "incident_id": string,"reporter_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "incident_id": string,"reporter_id": string
                  }
                  Update: {
                    "incident_id"?: string,"reporter_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "incident_reporters_incident_id_fkey"
      columns: ["incident_id"]
isOneToOne: true
      referencedRelation: "incidents"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "incident_reporters_reporter_id_fkey"
      columns: ["reporter_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"incidents": {
                  Row: {
                    "category": Database["public"]['Enums']["incident_category"],"description": string,"id": string,"location_text": string | null,"mode": Database["public"]['Enums']["incident_mode"],"org_id": string,"reference_code": string,"severity": Database["public"]['Enums']["incident_severity"],"status": Database["public"]['Enums']["incident_status"],"submitted_on": string,"tracking_token_hash": string | null,"updated_at": string
                  }
                  ComputedFields: never
                  Insert: {
                    "category": Database["public"]['Enums']["incident_category"],"description": string,"id"?: string,"location_text"?: string | null,"mode": Database["public"]['Enums']["incident_mode"],"org_id": string,"reference_code": string,"severity": Database["public"]['Enums']["incident_severity"],"status"?: Database["public"]['Enums']["incident_status"],"submitted_on"?: string,"tracking_token_hash"?: string | null,"updated_at"?: string
                  }
                  Update: {
                    "category"?: Database["public"]['Enums']["incident_category"],"description"?: string,"id"?: string,"location_text"?: string | null,"mode"?: Database["public"]['Enums']["incident_mode"],"org_id"?: string,"reference_code"?: string,"severity"?: Database["public"]['Enums']["incident_severity"],"status"?: Database["public"]['Enums']["incident_status"],"submitted_on"?: string,"tracking_token_hash"?: string | null,"updated_at"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "incidents_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"memberships": {
                  Row: {
                    "ended_on": string | null,"id": string,"org_id": string,"role": Database["public"]['Enums']["member_role"],"started_on": string,"status": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "ended_on"?: string | null,"id"?: string,"org_id": string,"role": Database["public"]['Enums']["member_role"],"started_on"?: string,"status"?: string,"user_id": string
                  }
                  Update: {
                    "ended_on"?: string | null,"id"?: string,"org_id"?: string,"role"?: Database["public"]['Enums']["member_role"],"started_on"?: string,"status"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "memberships_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "memberships_user_id_fkey"
      columns: ["user_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"organisations": {
                  Row: {
                    "created_at": string,"id": string,"is_demo": boolean,"join_code": string | null,"jurisdiction": string,"name": string,"sector": Database["public"]['Enums']["sector"]
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"id"?: string,"is_demo"?: boolean,"join_code"?: string | null,"jurisdiction"?: string,"name": string,"sector": Database["public"]['Enums']["sector"]
                  }
                  Update: {
                    "created_at"?: string,"id"?: string,"is_demo"?: boolean,"join_code"?: string | null,"jurisdiction"?: string,"name"?: string,"sector"?: Database["public"]['Enums']["sector"]
                  }
                  Relationships: [
                    
                  ]
                },"payslips": {
                  Row: {
                    "components": NonNullable<Json>,"created_at": string,"created_by": string | null,"deductions": NonNullable<Json>,"gross_paise": number,"id": string,"net_paise": number,"org_id": string,"paid_on": string | null,"period_end": string,"period_start": string,"status": string,"worker_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "components"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"deductions"?: NonNullable<Json>,"gross_paise": number,"id"?: string,"net_paise": number,"org_id": string,"paid_on"?: string | null,"period_end": string,"period_start": string,"status"?: string,"worker_id": string
                  }
                  Update: {
                    "components"?: NonNullable<Json>,"created_at"?: string,"created_by"?: string | null,"deductions"?: NonNullable<Json>,"gross_paise"?: number,"id"?: string,"net_paise"?: number,"org_id"?: string,"paid_on"?: string | null,"period_end"?: string,"period_start"?: string,"status"?: string,"worker_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "payslips_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payslips_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "payslips_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"preferred_locale": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name": string,"id": string,"preferred_locale"?: string
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"preferred_locale"?: string
                  }
                  Relationships: [
                    
                  ]
                },"shifts": {
                  Row: {
                    "break_minutes": number,"client_request_id": string,"created_at": string,"created_by": string | null,"ended_at": string | null,"id": string,"note": string | null,"org_id": string,"site_id": string | null,"source": Database["public"]['Enums']["record_source"],"started_at": string,"status": string,"time_source": string,"worker_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "break_minutes"?: number,"client_request_id": string,"created_at"?: string,"created_by"?: string | null,"ended_at"?: string | null,"id"?: string,"note"?: string | null,"org_id": string,"site_id"?: string | null,"source"?: Database["public"]['Enums']["record_source"],"started_at": string,"status"?: string,"time_source"?: string,"worker_id": string
                  }
                  Update: {
                    "break_minutes"?: number,"client_request_id"?: string,"created_at"?: string,"created_by"?: string | null,"ended_at"?: string | null,"id"?: string,"note"?: string | null,"org_id"?: string,"site_id"?: string | null,"source"?: Database["public"]['Enums']["record_source"],"started_at"?: string,"status"?: string,"time_source"?: string,"worker_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "shifts_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shifts_site_id_fkey"
      columns: ["site_id"]
isOneToOne: false
      referencedRelation: "sites"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "shifts_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"sites": {
                  Row: {
                    "id": string,"kind": string,"name": string,"org_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "id"?: string,"kind": string,"name": string,"org_id": string
                  }
                  Update: {
                    "id"?: string,"kind"?: string,"name"?: string,"org_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "sites_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                },"wage_calculations": {
                  Row: {
                    "created_at": string,"engine_version": string,"id": string,"inputs": NonNullable<Json>,"org_id": string,"period_end": string,"period_start": string,"result": NonNullable<Json>,"rule_set_id": string,"total_paise": number,"worker_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"engine_version": string,"id"?: string,"inputs": NonNullable<Json>,"org_id": string,"period_end": string,"period_start": string,"result": NonNullable<Json>,"rule_set_id": string,"total_paise": number,"worker_id": string
                  }
                  Update: {
                    "created_at"?: string,"engine_version"?: string,"id"?: string,"inputs"?: NonNullable<Json>,"org_id"?: string,"period_end"?: string,"period_start"?: string,"result"?: NonNullable<Json>,"rule_set_id"?: string,"total_paise"?: number,"worker_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wage_calculations_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wage_calculations_rule_set_id_fkey"
      columns: ["rule_set_id"]
isOneToOne: false
      referencedRelation: "wage_rule_sets"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wage_calculations_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"wage_disputes": {
                  Row: {
                    "calculation_id": string | null,"claimed_difference_paise": number,"client_request_id": string,"component_kind": string,"created_at": string,"description": string,"id": string,"org_id": string,"payslip_id": string,"status": Database["public"]['Enums']["dispute_status"],"updated_at": string,"worker_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "calculation_id"?: string | null,"claimed_difference_paise": number,"client_request_id": string,"component_kind": string,"created_at"?: string,"description": string,"id"?: string,"org_id": string,"payslip_id": string,"status"?: Database["public"]['Enums']["dispute_status"],"updated_at"?: string,"worker_id": string
                  }
                  Update: {
                    "calculation_id"?: string | null,"claimed_difference_paise"?: number,"client_request_id"?: string,"component_kind"?: string,"created_at"?: string,"description"?: string,"id"?: string,"org_id"?: string,"payslip_id"?: string,"status"?: Database["public"]['Enums']["dispute_status"],"updated_at"?: string,"worker_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "wage_disputes_calculation_id_fkey"
      columns: ["calculation_id"]
isOneToOne: false
      referencedRelation: "wage_calculations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wage_disputes_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wage_disputes_payslip_id_fkey"
      columns: ["payslip_id"]
isOneToOne: false
      referencedRelation: "payslips"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wage_disputes_worker_id_fkey"
      columns: ["worker_id"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    }
                  ]
                },"wage_rule_sets": {
                  Row: {
                    "base_rate_paise": number,"created_at": string,"created_by": string | null,"effective_from": string,"id": string,"label": string,"long_shift_minutes": number,"min_rest_minutes": number,"monthly_divisor_days": number,"night_allowance_paise": number,"night_end": string,"night_min_minutes": number,"night_start": string,"org_id": string,"ot_after_minutes": number,"ot_multiplier_pct": number,"pay_basis": Database["public"]['Enums']["pay_basis"],"source_note": string,"unpaid_break": boolean,"version": number
                  }
                  ComputedFields: never
                  Insert: {
                    "base_rate_paise": number,"created_at"?: string,"created_by"?: string | null,"effective_from": string,"id"?: string,"label": string,"long_shift_minutes"?: number,"min_rest_minutes"?: number,"monthly_divisor_days"?: number,"night_allowance_paise"?: number,"night_end"?: string,"night_min_minutes"?: number,"night_start"?: string,"org_id": string,"ot_after_minutes"?: number,"ot_multiplier_pct"?: number,"pay_basis": Database["public"]['Enums']["pay_basis"],"source_note": string,"unpaid_break"?: boolean,"version": number
                  }
                  Update: {
                    "base_rate_paise"?: number,"created_at"?: string,"created_by"?: string | null,"effective_from"?: string,"id"?: string,"label"?: string,"long_shift_minutes"?: number,"min_rest_minutes"?: number,"monthly_divisor_days"?: number,"night_allowance_paise"?: number,"night_end"?: string,"night_min_minutes"?: number,"night_start"?: string,"org_id"?: string,"ot_after_minutes"?: number,"ot_multiplier_pct"?: number,"pay_basis"?: Database["public"]['Enums']["pay_basis"],"source_note"?: string,"unpaid_break"?: boolean,"version"?: number
                  }
                  Relationships: [
                    {
      foreignKeyName: "wage_rule_sets_created_by_fkey"
      columns: ["created_by"]
isOneToOne: false
      referencedRelation: "profiles"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "wage_rule_sets_org_id_fkey"
      columns: ["org_id"]
isOneToOne: false
      referencedRelation: "organisations"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "_reporter_action":
{ Args: { "p_action": string,"p_actor": string,"p_body": string,"p_incident": string }; Returns: undefined
                           },
"anonymous_respond":
{ Args: { "p_action": string,"p_body": string,"p_token_hash": string }; Returns: undefined
                           },
"get_incident_by_token":
{ Args: { "p_token_hash": string }; Returns: Json
                           },
"has_org_role":
{ Args: { "p_org": string,"p_roles": (Database["public"]['Enums']["member_role"])[] }; Returns: boolean
                           },
"incident_insights":
{ Args: { "p_org": string }; Returns: {
              "category": string,"closed_count": number,"open_count": number,"total": number
            }[]
                           },
"is_reporter":
{ Args: { "p_incident": string }; Returns: boolean
                           },
"is_staff_for_user":
{ Args: { "p_user": string }; Returns: boolean
                           },
"join_org":
{ Args: { "p_code": string }; Returns: string
                           },
"log_export":
{ Args: { "p_categories": (string)[] }; Returns: undefined
                           },
"reporter_respond":
{ Args: { "p_action": string,"p_body": string,"p_incident": string }; Returns: undefined
                           },
"submit_anonymous_incident":
{ Args: { "p_category": Database["public"]['Enums']["incident_category"],"p_description": string,"p_location": string,"p_org": string,"p_severity": Database["public"]['Enums']["incident_severity"],"p_token_hash": string }; Returns: string
                           },
"submit_incident":
{ Args: { "p_category": Database["public"]['Enums']["incident_category"],"p_description": string,"p_location": string,"p_mode": Database["public"]['Enums']["incident_mode"],"p_org": string,"p_severity": Database["public"]['Enums']["incident_severity"] }; Returns: {
              "id": string,"reference_code": string
            }[]
                           },
"transition_dispute":
{ Args: { "p_body": string,"p_dispute": string,"p_to": Database["public"]['Enums']["dispute_status"] }; Returns: undefined
                           },
"transition_incident":
{ Args: { "p_body": string,"p_incident": string,"p_to": Database["public"]['Enums']["incident_status"],"p_visible"?: boolean }; Returns: undefined
                           }
          }
          Enums: {
            "dispute_status": "submitted"|"acknowledged"|"responded"|"accepted_by_worker"|"challenged"|"escalated"|"withdrawn"|"resolved","incident_category": "physical_hazard"|"unsafe_equipment"|"harassment"|"wages"|"excessive_hours"|"discrimination"|"other","incident_mode": "identified"|"confidential"|"anonymous","incident_severity": "low"|"medium"|"high"|"urgent","incident_status": "submitted"|"acknowledged"|"investigating"|"action_taken"|"resolved"|"closed_no_action"|"reopened"|"escalated","member_role": "worker"|"supervisor"|"payroll"|"investigator"|"org_admin","pay_basis": "hourly"|"daily"|"monthly","record_source": "worker"|"employer"|"system","sector": "construction"|"healthcare"
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
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
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            "dispute_status": ["submitted", "acknowledged", "responded", "accepted_by_worker", "challenged", "escalated", "withdrawn", "resolved"],"incident_category": ["physical_hazard", "unsafe_equipment", "harassment", "wages", "excessive_hours", "discrimination", "other"],"incident_mode": ["identified", "confidential", "anonymous"],"incident_severity": ["low", "medium", "high", "urgent"],"incident_status": ["submitted", "acknowledged", "investigating", "action_taken", "resolved", "closed_no_action", "reopened", "escalated"],"member_role": ["worker", "supervisor", "payroll", "investigator", "org_admin"],"pay_basis": ["hourly", "daily", "monthly"],"record_source": ["worker", "employer", "system"],"sector": ["construction", "healthcare"]
          }
        }
} as const

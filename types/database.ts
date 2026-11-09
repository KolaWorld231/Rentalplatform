/**
 * Hand-maintained types for the Supabase schema, mirroring
 * supabase/migrations/. Regenerate/extend as migrations are added; this
 * project does not yet run `supabase gen types` (requires a reachable
 * Supabase instance), so keep this file in sync by hand until that's wired
 * into CI.
 *
 * NOTE: these must be `type` aliases, not `interface`s — supabase-js's
 * generic Database inference breaks against interfaces in this version.
 */
export type AccountStatus = "active" | "suspended" | "deleted";
export type AppRole = "renter" | "owner" | "moderator" | "admin";

export type Profile = {
  id: string;
  display_name: string;
  phone: string | null;
  phone_verified_at: string | null;
  avatar_path: string | null;
  account_status: AccountStatus;
  created_at: string;
  updated_at: string;
};

export type UserRole = {
  user_id: string;
  role: AppRole;
  granted_by: string | null;
  granted_at: string;
};

export type OwnerProfile = {
  user_id: string;
  business_name: string | null;
  bio: string | null;
  public_phone: string | null;
  public_contact_opt_in: boolean;
  created_at: string;
  updated_at: string;
};

export const LIBERIA_COUNTIES = [
  "Bomi",
  "Bong",
  "Gbarpolu",
  "Grand Bassa",
  "Grand Cape Mount",
  "Grand Gedeh",
  "Grand Kru",
  "Lofa",
  "Margibi",
  "Maryland",
  "Montserrado",
  "Nimba",
  "River Cess",
  "River Gee",
  "Sinoe",
] as const;
export type LiberiaCounty = (typeof LIBERIA_COUNTIES)[number];

export const PROPERTY_CATEGORIES = [
  "apartment",
  "house",
  "room",
  "shared_room",
  "studio",
  "store",
  "shop",
  "office",
  "warehouse",
  "short_term",
  "land",
] as const;
export type PropertyCategory = (typeof PROPERTY_CATEGORIES)[number];

export type PropertyUsage = "residential" | "commercial" | "land";
export type RentalFrequency = "monthly" | "quarterly" | "yearly" | "nightly";
export type ListingStatus =
  | "draft"
  | "pending_review"
  | "published"
  | "temporarily_unavailable"
  | "pending_rental"
  | "rented"
  | "rejected"
  | "suspended"
  | "archived";
export type AvailabilityStatus =
  | "available"
  | "pending_rental"
  | "rented"
  | "temporarily_unavailable";

export type Property = {
  id: string;
  owner_id: string;
  manager_id: string | null;
  title: string;
  slug: string;
  description: string;
  category: PropertyCategory;
  usage_type: PropertyUsage;
  rent_amount: number;
  currency: string;
  rental_frequency: RentalFrequency;
  county: LiberiaCounty;
  city: string;
  community: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  bedrooms: number | null;
  bathrooms: number | null;
  floor_area_sqm: number | null;
  furnished: boolean | null;
  has_electricity: boolean | null;
  has_water: boolean | null;
  has_air_conditioning: boolean | null;
  has_parking: boolean | null;
  has_security: boolean | null;
  road_accessible: boolean | null;
  advance_rent_amount: number | null;
  security_deposit_amount: number | null;
  other_fees_amount: number | null;
  other_fees_description: string | null;
  lease_duration_months: number | null;
  move_in_date: string | null;
  listing_status: ListingStatus;
  availability_status: AvailabilityStatus;
  moderation_reason: string | null;
  view_count: number;
  favourite_count: number;
  published_at: string | null;
  last_availability_confirmed_at: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyImage = {
  id: string;
  property_id: string;
  storage_path: string;
  position: number;
  is_cover: boolean;
  created_at: string;
};

export type PropertyFavourite = {
  user_id: string;
  property_id: string;
  created_at: string;
};

export type PropertyView = {
  id: number;
  property_id: string;
  viewer_id: string | null;
  viewer_fingerprint: string | null;
  viewed_at: string;
};

export type ReportStatus = "open" | "investigating" | "resolved" | "dismissed";
export type ReportReason =
  | "fake_listing"
  | "misleading_price"
  | "already_rented"
  | "unauthorized_representative"
  | "impersonation"
  | "harassment"
  | "fraudulent_payment_request"
  | "suspicious_message"
  | "other";

export type PropertyReport = {
  id: string;
  property_id: string;
  reporter_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  assigned_moderator_id: string | null;
  resolution_notes: string | null;
  created_at: string;
  resolved_at: string | null;
};

export type SubscriptionStatus =
  | "pending_payment"
  | "active"
  | "expired"
  | "cancelled"
  | "payment_failed"
  | "refunded"
  | "suspended";

export type PaymentStatus = "initiated" | "pending" | "confirmed" | "failed" | "reversed" | "refunded";
export type WebhookProcessingStatus = "received" | "processed" | "failed" | "duplicate";

export type SubscriptionPlan = {
  id: string;
  name: string;
  price_usd: number;
  duration_days: number;
  is_active: boolean;
  created_at: string;
};

export type Subscription = {
  id: string;
  user_id: string;
  plan_id: string;
  status: SubscriptionStatus;
  activated_at: string | null;
  expires_at: string | null;
  payment_transaction_id: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentTransaction = {
  id: string;
  user_id: string;
  subscription_id: string | null;
  provider: string;
  provider_transaction_id: string | null;
  internal_reference: string;
  amount: number;
  currency: string;
  status: PaymentStatus;
  provider_event_ref: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
};

export type ConversationStatus = "active" | "archived" | "blocked";

export type Conversation = {
  id: string;
  property_id: string;
  renter_id: string;
  owner_id: string;
  status: ConversationStatus;
  renter_last_read_at: string | null;
  owner_last_read_at: string | null;
  created_at: string;
  updated_at: string;
};

export type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  body: string;
  sent_at: string;
};

export type MessageReport = {
  id: string;
  message_id: string;
  conversation_id: string;
  reporter_id: string;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  created_at: string;
};

export type VerificationStatus = "submitted" | "under_review" | "verified" | "rejected" | "needs_more_info" | "expired";

export type IdentityVerificationRequest = {
  id: string;
  user_id: string;
  status: VerificationStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PropertyVerificationRequest = {
  id: string;
  property_id: string;
  applicant_id: string;
  status: VerificationStatus;
  submitted_at: string;
  reviewed_at: string | null;
  reviewer_id: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PrivateVerificationDocument = {
  id: string;
  identity_request_id: string | null;
  property_request_id: string | null;
  storage_path: string;
  original_filename: string | null;
  content_type: string;
  file_size_bytes: number;
  uploaded_by: string;
  created_at: string;
};

export type NotificationType =
  | "new_message"
  | "subscription_activated"
  | "subscription_expiring"
  | "payment_failed"
  | "listing_approved"
  | "listing_rejected"
  | "verification_update"
  | "account_notice"
  | "support_update";

export type Notification = {
  id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  body: string | null;
  link: string | null;
  read_at: string | null;
  created_at: string;
};

export type NotificationPreferences = {
  user_id: string;
  email_enabled: boolean;
  in_app_enabled: boolean;
  push_enabled: boolean;
  updated_at: string;
};

export type PushToken = {
  id: string;
  user_id: string;
  token: string;
  platform: "ios" | "android";
  created_at: string;
};

export type AdminAuditLog = {
  id: string;
  // Nullable as of the Scout Program migration -- a null actor means a
  // system/public event (e.g. an applicant's own submission), not an
  // admin action.
  actor_id: string | null;
  action: string;
  target_table: string;
  target_id: string;
  reason: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export type SupportTicketStatus = "open" | "in_progress" | "resolved" | "closed";

export type SupportTicket = {
  id: string;
  user_id: string;
  subject: string;
  message: string;
  status: SupportTicketStatus;
  assigned_to: string | null;
  resolution_notes: string | null;
  created_at: string;
  updated_at: string;
};

export type PaymentWebhookEvent = {
  id: string;
  provider: string;
  event_id: string;
  payload: Record<string, unknown>;
  processing_status: WebhookProcessingStatus;
  related_transaction_id: string | null;
  error_message: string | null;
  created_at: string;
  processed_at: string | null;
};

export type WebAuthnCredential = {
  id: string;
  user_id: string;
  credential_id: string;
  public_key: string;
  counter: number;
  device_type: string;
  backed_up: boolean;
  transports: string[];
  label: string;
  created_at: string;
  last_used_at: string | null;
};

export type WebAuthnChallengePurpose = "registration" | "authentication";

export type WebAuthnChallenge = {
  id: string;
  user_id: string | null;
  purpose: WebAuthnChallengePurpose;
  challenge: string;
  metadata: Record<string, unknown>;
  expires_at: string;
  created_at: string;
};

export type WhatsAppOtpPurpose = "signup" | "login";

export type WhatsAppOtpChallenge = {
  id: string;
  phone: string;
  code_hash: string;
  purpose: WhatsAppOtpPurpose;
  metadata: Record<string, unknown>;
  attempts: number;
  expires_at: string;
  created_at: string;
};

// Scout Program (Milestone 1) ----------------------------------------------

export type ScoutApplicationStatus = "applied" | "waitlisted" | "withdrawn" | "under_review" | "rejected" | "approved";
export type ScoutReferenceRelationship = "family" | "employer" | "community_leader" | "other";
export type ScoutReferenceOutcome = "reached_positive" | "reached_concern" | "not_reached";
export type ScoutStatus = "probation" | "active" | "suspended" | "removed" | "resigned";
export type ScoutVerificationStepType = "completeness_check" | "reference_check" | "identity_check" | "interview";
export type ScoutVerificationStepStatus = "pending" | "passed" | "failed" | "skipped";

export type ScoutArea = {
  id: string;
  county: LiberiaCounty;
  neighborhood: string;
  seat_cap: number;
  seats_filled: number;
  is_open: boolean;
  created_at: string;
};

export type ScoutApplication = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  age_confirmed: boolean;
  age_confirmed_at: string;
  area_id: string;
  area_knowledge: string;
  experience: string | null;
  smartphone_model: string;
  has_data_access: boolean;
  motivation: string;
  code_of_conduct_version: string;
  code_of_conduct_accepted_at: string;
  verification_consent_at: string;
  phone_verified_at: string;
  status: ScoutApplicationStatus;
  reference_code: string;
  reapply_after: string | null;
  decision_reason: string | null;
  decided_by: string | null;
  decided_at: string | null;
  created_at: string;
};

export type ScoutReference = {
  id: string;
  application_id: string;
  full_name: string;
  relationship: ScoutReferenceRelationship;
  phone: string;
  contacted_at: string | null;
  outcome: ScoutReferenceOutcome | null;
  notes: string | null;
  reviewed_by: string | null;
  created_at: string;
};

export type ScoutVerificationStep = {
  id: string;
  application_id: string;
  step_type: ScoutVerificationStepType;
  status: ScoutVerificationStepStatus;
  reviewer_id: string | null;
  notes: string | null;
  document_storage_path: string | null;
  completed_at: string | null;
  created_at: string;
};

export type Scout = {
  id: string;
  user_id: string | null;
  application_id: string;
  status: ScoutStatus;
  approved_at: string;
  probation_ends_at: string;
  referral_code: string;
  display_name: string;
  area_id: string;
  created_at: string;
  updated_at: string;
};

export type OwnerReferralSource = "code" | "invite" | "manual";
export type OwnerReferralStatus = "pending_confirmation" | "confirmed" | "declined";

export type OwnerReferral = {
  id: string;
  scout_id: string;
  owner_user_id: string;
  source: OwnerReferralSource;
  status: OwnerReferralStatus;
  confirmed_by_owner_at: string | null;
  is_payable: boolean;
  attributed_at: string;
  attribution_locked: boolean;
  created_at: string;
};

export type ScoutEarningType = "bounty" | "share" | "visit_fee" | "adjustment" | "clawback";
export type ScoutEarningStatus = "pending" | "approved" | "paid" | "reversed";
export type ScoutPayoutStatus = "pending" | "paid" | "failed";

export type ScoutEarningsLedgerEntry = {
  id: string;
  scout_id: string;
  owner_referral_id: string | null;
  type: ScoutEarningType;
  amount: number;
  currency: string;
  status: ScoutEarningStatus;
  source_ref: string | null;
  reason: string | null;
  created_at: string;
};

export type ScoutVisitReportStatus = "pending" | "approved" | "rejected";

export type ScoutVisitReport = {
  id: string;
  scout_id: string;
  listing_id: string;
  checklist: Record<string, unknown>;
  notes: string | null;
  photo_paths: string[];
  status: ScoutVisitReportStatus;
  reviewed_by: string | null;
  created_at: string;
};

export type ScoutPayout = {
  id: string;
  scout_id: string;
  amount: number;
  currency: string;
  method: string | null;
  provider_reference: string | null;
  status: ScoutPayoutStatus;
  paid_by: string | null;
  paid_at: string | null;
  created_at: string;
};

export type ScoutApplicationOtpChallenge = {
  id: string;
  phone: string;
  code_hash: string;
  attempts: number;
  expires_at: string;
  verified_at: string | null;
  created_at: string;
};

type TableDef<Row, Insert, Update = Partial<Insert>> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: [];
};

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      profiles: TableDef<Profile, Partial<Profile> & Pick<Profile, "id" | "display_name">, Partial<Profile>>;
      user_roles: TableDef<UserRole, Pick<UserRole, "user_id" | "role"> & Partial<UserRole>>;
      owner_profiles: TableDef<OwnerProfile, Partial<OwnerProfile> & Pick<OwnerProfile, "user_id">>;
      properties: TableDef<
        Property,
        Partial<Property> &
          Pick<Property, "owner_id" | "title" | "slug" | "category" | "usage_type" | "rent_amount" | "county" | "city">
      >;
      property_images: TableDef<
        PropertyImage,
        Partial<PropertyImage> & Pick<PropertyImage, "property_id" | "storage_path">
      >;
      property_favourites: TableDef<
        PropertyFavourite,
        Pick<PropertyFavourite, "user_id" | "property_id"> & Partial<PropertyFavourite>
      >;
      property_views: TableDef<
        PropertyView,
        Partial<PropertyView> & Pick<PropertyView, "property_id">
      >;
      property_reports: TableDef<
        PropertyReport,
        Partial<PropertyReport> & Pick<PropertyReport, "property_id" | "reporter_id" | "reason">
      >;
      subscription_plans: TableDef<SubscriptionPlan, Partial<SubscriptionPlan> & Pick<SubscriptionPlan, "name" | "price_usd" | "duration_days">>;
      subscriptions: TableDef<Subscription, Partial<Subscription> & Pick<Subscription, "user_id" | "plan_id">>;
      payment_transactions: TableDef<
        PaymentTransaction,
        Partial<PaymentTransaction> & Pick<PaymentTransaction, "user_id" | "provider" | "amount">
      >;
      payment_webhook_events: TableDef<
        PaymentWebhookEvent,
        Partial<PaymentWebhookEvent> & Pick<PaymentWebhookEvent, "provider" | "event_id" | "payload">
      >;
      conversations: TableDef<
        Conversation,
        Partial<Conversation> & Pick<Conversation, "property_id" | "renter_id" | "owner_id">
      >;
      messages: TableDef<Message, Partial<Message> & Pick<Message, "conversation_id" | "sender_id" | "body">>;
      message_reports: TableDef<
        MessageReport,
        Partial<MessageReport> & Pick<MessageReport, "message_id" | "conversation_id" | "reporter_id" | "reason">
      >;
      identity_verification_requests: TableDef<
        IdentityVerificationRequest,
        Partial<IdentityVerificationRequest> & Pick<IdentityVerificationRequest, "user_id">
      >;
      property_verification_requests: TableDef<
        PropertyVerificationRequest,
        Partial<PropertyVerificationRequest> & Pick<PropertyVerificationRequest, "property_id" | "applicant_id">
      >;
      private_verification_documents: TableDef<
        PrivateVerificationDocument,
        Partial<PrivateVerificationDocument> &
          Pick<PrivateVerificationDocument, "storage_path" | "content_type" | "file_size_bytes" | "uploaded_by">
      >;
      notifications: TableDef<Notification, Partial<Notification> & Pick<Notification, "user_id" | "type" | "title">>;
      notification_preferences: TableDef<
        NotificationPreferences,
        Partial<NotificationPreferences> & Pick<NotificationPreferences, "user_id">
      >;
      push_tokens: TableDef<PushToken, Partial<PushToken> & Pick<PushToken, "user_id" | "token" | "platform">>;
      admin_audit_logs: TableDef<
        AdminAuditLog,
        Partial<AdminAuditLog> & Pick<AdminAuditLog, "actor_id" | "action" | "target_table" | "target_id">
      >;
      support_tickets: TableDef<
        SupportTicket,
        Partial<SupportTicket> & Pick<SupportTicket, "user_id" | "subject" | "message">
      >;
      webauthn_credentials: TableDef<
        WebAuthnCredential,
        Partial<WebAuthnCredential> & Pick<WebAuthnCredential, "user_id" | "credential_id" | "public_key" | "device_type">
      >;
      webauthn_challenges: TableDef<
        WebAuthnChallenge,
        Partial<WebAuthnChallenge> & Pick<WebAuthnChallenge, "purpose" | "challenge" | "expires_at">
      >;
      whatsapp_otp_challenges: TableDef<
        WhatsAppOtpChallenge,
        Partial<WhatsAppOtpChallenge> & Pick<WhatsAppOtpChallenge, "phone" | "code_hash" | "purpose" | "expires_at">
      >;
      scout_areas: TableDef<ScoutArea, Partial<ScoutArea> & Pick<ScoutArea, "county" | "neighborhood">>;
      scout_applications: TableDef<
        ScoutApplication,
        Partial<ScoutApplication> &
          Pick<
            ScoutApplication,
            | "full_name"
            | "phone"
            | "age_confirmed"
            | "age_confirmed_at"
            | "area_id"
            | "area_knowledge"
            | "smartphone_model"
            | "has_data_access"
            | "motivation"
            | "code_of_conduct_version"
            | "code_of_conduct_accepted_at"
            | "verification_consent_at"
            | "phone_verified_at"
          >
      >;
      scout_references: TableDef<
        ScoutReference,
        Partial<ScoutReference> & Pick<ScoutReference, "application_id" | "full_name" | "relationship" | "phone">
      >;
      scout_application_otp_challenges: TableDef<
        ScoutApplicationOtpChallenge,
        Partial<ScoutApplicationOtpChallenge> & Pick<ScoutApplicationOtpChallenge, "phone" | "code_hash" | "expires_at">
      >;
      scout_verification_steps: TableDef<
        ScoutVerificationStep,
        Partial<ScoutVerificationStep> & Pick<ScoutVerificationStep, "application_id" | "step_type">
      >;
      scouts: TableDef<
        Scout,
        Partial<Scout> & Pick<Scout, "application_id" | "probation_ends_at" | "referral_code" | "display_name" | "area_id">
      >;
      owner_referrals: TableDef<OwnerReferral, Partial<OwnerReferral> & Pick<OwnerReferral, "scout_id" | "owner_user_id" | "source">>;
      scout_earnings_ledger: TableDef<
        ScoutEarningsLedgerEntry,
        Partial<ScoutEarningsLedgerEntry> & Pick<ScoutEarningsLedgerEntry, "scout_id" | "type" | "amount">
      >;
      scout_payouts: TableDef<ScoutPayout, Partial<ScoutPayout> & Pick<ScoutPayout, "scout_id" | "amount">>;
      scout_visit_reports: TableDef<
        ScoutVisitReport,
        Partial<ScoutVisitReport> & Pick<ScoutVisitReport, "scout_id" | "listing_id">
      >;
    };
    Views: Record<string, never>;
    Functions: {
      has_active_subscription: {
        Args: { target_user: string };
        Returns: boolean;
      };
      confirm_payment_and_activate_subscription: {
        Args: { p_transaction_id: string; p_provider_event_ref: string };
        Returns: Subscription;
      };
      is_identity_verified: { Args: { target_user: string }; Returns: boolean };
      is_property_verified: { Args: { target_property: string }; Returns: boolean };
      submit_scout_application: {
        Args: {
          p_full_name: string;
          p_phone: string;
          p_email: string | null;
          p_area_id: string;
          p_area_knowledge: string;
          p_experience: string | null;
          p_smartphone_model: string;
          p_has_data_access: boolean;
          p_motivation: string;
          p_code_of_conduct_version: string;
          p_phone_verified_at: string;
          p_references: { fullName: string; relationship: ScoutReferenceRelationship; phone: string }[];
        };
        Returns: { id: string; status: ScoutApplicationStatus; reference_code: string }[];
      };
    };
    Enums: {
      account_status: AccountStatus;
      app_role: AppRole;
      liberia_county: LiberiaCounty;
      property_category: PropertyCategory;
      property_usage: PropertyUsage;
      rental_frequency: RentalFrequency;
      listing_status: ListingStatus;
      availability_status: AvailabilityStatus;
      report_status: ReportStatus;
      report_reason: ReportReason;
      subscription_status: SubscriptionStatus;
      payment_status: PaymentStatus;
      webhook_processing_status: WebhookProcessingStatus;
      conversation_status: ConversationStatus;
      verification_status: VerificationStatus;
      notification_type: NotificationType;
      support_ticket_status: SupportTicketStatus;
      scout_application_status: ScoutApplicationStatus;
      scout_reference_relationship: ScoutReferenceRelationship;
      scout_reference_outcome: ScoutReferenceOutcome;
      scout_status: ScoutStatus;
      scout_verification_step_type: ScoutVerificationStepType;
      scout_verification_step_status: ScoutVerificationStepStatus;
      owner_referral_source: OwnerReferralSource;
      owner_referral_status: OwnerReferralStatus;
      scout_earning_type: ScoutEarningType;
      scout_earning_status: ScoutEarningStatus;
      scout_payout_status: ScoutPayoutStatus;
      scout_visit_report_status: ScoutVisitReportStatus;
    };
    CompositeTypes: Record<string, never>;
  };
};

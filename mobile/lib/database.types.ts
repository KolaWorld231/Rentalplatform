// Hand-ported from ../../types/database.ts (the web app's own
// hand-maintained Supabase types) -- same reasoning applies: this project
// doesn't run `supabase gen types` against a reachable instance in CI, so
// keep this in sync by hand when the schema changes. Starts with the
// tables Milestone 1 (auth) needs; extended table-by-table as later
// mobile milestones start querying them, mirroring the web types file
// exactly rather than guessing shapes ahead of need.
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
export type AvailabilityStatus = "available" | "pending_rental" | "rented" | "temporarily_unavailable";

export type Property = {
  id: string;
  owner_id: string;
  manager_id: string | null;
  title: string;
  slug: string;
  description: string;
  category: PropertyCategory;
  usage_type: "residential" | "commercial" | "land";
  rent_amount: number;
  currency: string;
  rental_frequency: "monthly" | "quarterly" | "yearly" | "nightly";
  county: LiberiaCounty;
  city: string;
  community: string | null;
  landmark: string | null;
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

export type SubscriptionStatus =
  | "pending_payment"
  | "active"
  | "expired"
  | "cancelled"
  | "payment_failed"
  | "refunded"
  | "suspended";

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
      properties: TableDef<Property, Partial<Property>>;
      property_images: TableDef<PropertyImage, Partial<PropertyImage>>;
      property_favourites: TableDef<PropertyFavourite, Pick<PropertyFavourite, "user_id" | "property_id"> & Partial<PropertyFavourite>>;
      subscriptions: TableDef<Subscription, Partial<Subscription>>;
      conversations: TableDef<Conversation, Pick<Conversation, "property_id" | "renter_id" | "owner_id"> & Partial<Conversation>>;
      messages: TableDef<Message, Pick<Message, "conversation_id" | "sender_id" | "body"> & Partial<Message>>;
    };
    Views: Record<string, never>;
    Functions: {
      grant_owner_role_to_self: {
        Args: Record<string, never>;
        Returns: void;
      };
      start_mobile_checkout: {
        Args: Record<string, never>;
        Returns: {
          transaction_id: string;
          internal_reference: string;
          subscription_id: string;
          amount: number;
          plan_name: string;
          duration_days: number;
        }[];
      };
    };
    Enums: {
      account_status: AccountStatus;
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
};

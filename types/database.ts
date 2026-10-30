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

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13";
  };
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & Pick<Profile, "id" | "display_name">;
        Update: Partial<Profile>;
        Relationships: [];
      };
      user_roles: {
        Row: UserRole;
        Insert: Pick<UserRole, "user_id" | "role"> & Partial<UserRole>;
        Update: Partial<UserRole>;
        Relationships: [];
      };
      owner_profiles: {
        Row: OwnerProfile;
        Insert: Partial<OwnerProfile> & Pick<OwnerProfile, "user_id">;
        Update: Partial<OwnerProfile>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      account_status: AccountStatus;
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
};

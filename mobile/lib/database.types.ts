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
    };
    Views: Record<string, never>;
    Functions: {
      grant_owner_role_to_self: {
        Args: Record<string, never>;
        Returns: void;
      };
    };
    Enums: {
      account_status: AccountStatus;
      app_role: AppRole;
    };
    CompositeTypes: Record<string, never>;
  };
};

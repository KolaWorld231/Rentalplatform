import { useQuery } from "@tanstack/react-query";
import { supabase } from "../supabase";
import type { AppRole } from "../database.types";
import { useSession } from "./session";

export function useUserRoles() {
  const { user } = useSession();

  return useQuery<AppRole[]>({
    queryKey: ["user-roles", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user!.id);
      return (data ?? []).map((row) => row.role);
    },
  });
}

import { logoutAction } from "@/lib/auth/actions";
import { requireUser } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ProfileForm } from "./ProfileForm";

export default async function AccountPage() {
  const user = await requireUser("/account");
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, phone")
    .eq("id", user.id)
    .single();

  return (
    <div className="mx-auto max-w-2xl px-4 py-10 sm:px-6">
      <h1 className="font-display text-2xl font-semibold text-charcoal-700">Account settings</h1>
      <p className="mt-1 text-sm text-charcoal-500">{user.email}</p>

      <Card className="mt-6 p-6">
        <ProfileForm displayName={profile?.display_name ?? ""} phone={profile?.phone ?? null} />
      </Card>

      <form action={logoutAction} className="mt-6">
        <Button type="submit" variant="secondary">
          Log out
        </Button>
      </form>
    </div>
  );
}

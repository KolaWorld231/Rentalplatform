import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS = join(process.cwd(), "supabase/migrations");

function allMigrationSql(): string {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS, f), "utf8"))
    .join("\n");
}

/**
 * Deleting an account failed outright for anyone who had ever paid:
 * payment_webhook_events restricts on payment_transactions, which
 * cascaded from auth.users.
 *
 * The fix had to avoid the obvious shortcut. Cascading that last foreign
 * key would make deletion work by erasing the ledger -- amounts, provider
 * references, verified-at timestamps -- for every payment the person made.
 * Instead the money stays and the person is detached.
 *
 * These assert the intent survives in the migrations. Deletion behaviour
 * itself was exercised against a local Postgres carrying every migration:
 * the delete succeeds, the subscription and transaction rows remain with
 * a null user_id, the payer MSISDN is gone from the webhook payload, and
 * the unique (provider, event_id) idempotency guarantee still rejects a
 * replayed event.
 */
describe("account deletion keeps the payment ledger", () => {
  const sql = allMigrationSql();

  it("detaches rather than cascades on both payment tables", () => {
    for (const table of ["subscriptions", "payment_transactions"]) {
      const pattern = new RegExp(
        `add constraint ${table}_user_id_fkey\\s+foreign key \\(user_id\\) references auth\\.users \\(id\\) on delete set null`,
        "i",
      );
      expect(sql).toMatch(pattern);
    }
  });

  it("makes user_id nullable so set null is possible", () => {
    for (const table of ["subscriptions", "payment_transactions"]) {
      expect(sql).toMatch(new RegExp(`alter table public\\.${table} alter column user_id drop not null`, "i"));
    }
  });

  it("redacts the provider payload when a transaction loses its owner", () => {
    // The raw payload carries the payer's phone number for mobile money.
    // Severing user_id alone would leave it sitting beside the payment.
    expect(sql).toMatch(/create trigger payment_transactions_redact_on_owner_loss/i);
    expect(sql).toMatch(/when \(old\.user_id is not null and new\.user_id is null\)/i);
    expect(sql).toMatch(/update public\.payment_webhook_events\s+set payload = jsonb_build_object/i);
  });

  it("never grants the redaction function to a client role", () => {
    expect(sql).toMatch(
      /revoke all on function public\.redact_webhook_payload_on_owner_loss\(\) from public, anon, authenticated/i,
    );
    expect(sql).not.toMatch(
      /grant execute on function public\.redact_webhook_payload_on_owner_loss\(\)\s+to\s+[^;]*\b(anon|authenticated)\b/i,
    );
  });
});

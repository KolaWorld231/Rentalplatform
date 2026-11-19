import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const MIGRATIONS = join(process.cwd(), "supabase/migrations");
const ACTIVATION_FN = "confirm_payment_and_activate_subscription";

function allMigrationSql(): string {
  return readdirSync(MIGRATIONS)
    .filter((f) => f.endsWith(".sql"))
    .sort()
    .map((f) => readFileSync(join(MIGRATIONS, f), "utf8"))
    .join("\n");
}

/**
 * A client being able to call the activation function is a complete
 * bypass of the payment system: sign up, let the checkout create a
 * pending transaction, call this on it, and the subscription is active
 * without any payment. That was the live state of the hosted project --
 * the original revoke was present in the migrations but not in the
 * deployed schema.
 *
 * These assert the intent is present and explicit in the migrations.
 * They cannot observe the deployed database, so they are a guard against
 * the grant being loosened in code, not proof that production is correct
 * -- that has to be probed against the live project.
 */
describe("activation RPC grants", () => {
  const sql = allMigrationSql();

  it("grants execute on the activation function only to service_role", () => {
    const grants = [...sql.matchAll(new RegExp(`grant execute on function public\\.${ACTIVATION_FN}\\([^)]*\\)\\s+to\\s+([^;]+);`, "gi"))].map(
      (m) => m[1].trim().toLowerCase(),
    );

    expect(grants.length).toBeGreaterThan(0);
    for (const grantee of grants) {
      expect(grantee).toBe("service_role");
    }
  });

  it("revokes the activation function from anon and authenticated by name", () => {
    // Revoking from PUBLIC does not remove a privilege held directly by
    // anon or authenticated, so each has to be named.
    for (const role of ["public", "anon", "authenticated"]) {
      const pattern = new RegExp(`revoke all on function public\\.${ACTIVATION_FN}\\([^)]*\\)\\s+from\\s+[^;]*\\b${role}\\b`, "i");
      expect(sql).toMatch(pattern);
    }
  });

  it("never grants the activation function to anon or authenticated", () => {
    const pattern = new RegExp(`grant execute on function public\\.${ACTIVATION_FN}\\([^)]*\\)\\s+to\\s+[^;]*\\b(anon|authenticated)\\b`, "i");
    expect(sql).not.toMatch(pattern);
  });
});

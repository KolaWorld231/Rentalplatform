// Uploads generated placeholder imagery for showcase listings that have
// none, then records them in property_images.
//
// Idempotent: a listing that already has an image is skipped, so this is
// safe to re-run after adding listings. Generation itself is
// deterministic (scripts/generate-showcase-images.py keys off the slug),
// so re-running never reshuffles what is already on the site.
//
// Why generated rather than stock photography: see the header of
// generate-showcase-images.py. Short version -- the free sources with
// real building photography carry attribution obligations, and the ones
// without them are random subjects. These are openly illustrations,
// which is the same thing the "Showcase listing" badge says.
import { createClient } from "@supabase/supabase-js";
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=");
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);
const IMAGES_PER_LISTING = 3;

const { data: listings, error } = await supabase
  .from("properties")
  .select("id, slug, category, title, property_images(id)")
  .eq("is_showcase", true);
if (error) throw error;

const needing = listings.filter((l) => (l.property_images ?? []).length === 0);
console.log(`showcase listings: ${listings.length}, needing images: ${needing.length}`);
if (needing.length === 0) process.exit(0);

const dir = mkdtempSync(join(tmpdir(), "showcase-"));
try {
  execFileSync(
    "python3",
    ["scripts/generate-showcase-images.py", dir, ...needing.map((l) => `${l.slug}:${l.category}`)],
    { stdio: "inherit" },
  );

  let uploaded = 0;
  for (const listing of needing) {
    const paths = [];
    try {
      for (let v = 0; v < IMAGES_PER_LISTING; v++) {
        const file = readFileSync(join(dir, `${listing.slug}-${v}.jpg`));
        const path = `${listing.id}/${randomUUID()}.jpg`;
        const { error: upErr } = await supabase.storage
          .from("property-images")
          .upload(path, file, { contentType: "image/jpeg", cacheControl: "31536000" });
        if (upErr) throw upErr;
        paths.push(path);
      }

      const { error: rowErr } = await supabase.from("property_images").insert(
        paths.map((storage_path, i) => ({
          property_id: listing.id,
          storage_path,
          position: i,
          is_cover: i === 0,
        })),
      );
      if (rowErr) throw rowErr;
      uploaded += 1;
      console.log(`  ${listing.title}`);
    } catch (e) {
      // Never leave objects in the bucket with no row pointing at them.
      if (paths.length) await supabase.storage.from("property-images").remove(paths);
      console.error(`  FAILED ${listing.title}: ${e.message}`);
    }
  }
  console.log(JSON.stringify({ listingsWithNewImages: uploaded, imagesEach: IMAGES_PER_LISTING }, null, 2));
} finally {
  rmSync(dir, { recursive: true, force: true });
}

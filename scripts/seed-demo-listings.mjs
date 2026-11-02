// Idempotent: seeds a fixed set of published placeholder listings owned by
// a clearly-labeled "DomiLink Listings Team" account, so the marketplace
// isn't empty while real owners are still onboarding. Safe to re-run —
// matches on slug/email and skips what already exists. Per CLAUDE.md rule
// #9, this is the one sanctioned exception to "never fabricate demo data
// in production paths": it's disclosed here, in the owner account's own
// bio, and in docs/IMPLEMENTATION_STATUS.md, rather than presented as real
// inventory. Delete this content (and its owner account) the moment real
// listings make it redundant.
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = Object.fromEntries(
  readFileSync(".env.local", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const idx = l.indexOf("=");
      return [l.slice(0, idx), l.slice(idx + 1)];
    }),
);

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

const DEMO_OWNER_EMAIL = "demo-listings@domilink.app";

async function getOrCreateDemoOwner() {
  const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const found = existing?.users?.find((u) => u.email === DEMO_OWNER_EMAIL);
  if (found) return found.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_OWNER_EMAIL,
    password: `DemoOwner-${Math.random().toString(36).slice(2)}-${Date.now()}`,
    email_confirm: true,
    user_metadata: { display_name: "DomiLink Listings Team" },
  });
  if (error) throw error;
  return data.user.id;
}

const ownerId = await getOrCreateDemoOwner();

await supabase.from("user_roles").upsert({ user_id: ownerId, role: "owner" }, { onConflict: "user_id,role" });

await supabase.from("owner_profiles").upsert({
  user_id: ownerId,
  business_name: "DomiLink Listings Team",
  bio: "Placeholder listings maintained by the DomiLink team to showcase the marketplace while real property owners come on board. Not available for rent — contact Help & Support with questions.",
  public_contact_opt_in: false,
});

const now = new Date().toISOString();

const LISTINGS = [
  {
    title: "Modern 2-Bedroom Apartment in Sinkor",
    description:
      "Bright, newly renovated 2-bedroom apartment on a quiet street in Sinkor. Tiled floors throughout, fitted kitchen, and a private balcony. Steady electricity and water supply, with 24-hour security at the compound gate.",
    category: "apartment",
    usage_type: "residential",
    rent_amount: 350,
    rental_frequency: "monthly",
    county: "Montserrado",
    city: "Sinkor",
    community: "Old Road",
    bedrooms: 2,
    bathrooms: 2,
    furnished: false,
    has_electricity: true,
    has_water: true,
    has_air_conditioning: true,
    has_parking: true,
    has_security: true,
    road_accessible: true,
    advance_rent_amount: 350,
    security_deposit_amount: 350,
  },
  {
    title: "Family House with Yard in Paynesville",
    description:
      "Spacious 3-bedroom family home with a fenced yard, ideal for a growing household. Separate living and dining areas, outdoor kitchen space, and parking for two vehicles. Close to schools and the Red Light market.",
    category: "house",
    usage_type: "residential",
    rent_amount: 500,
    rental_frequency: "monthly",
    county: "Montserrado",
    city: "Paynesville",
    community: "Red Light",
    bedrooms: 3,
    bathrooms: 2,
    furnished: false,
    has_electricity: true,
    has_water: true,
    has_air_conditioning: false,
    has_parking: true,
    has_security: false,
    road_accessible: true,
    advance_rent_amount: 500,
    security_deposit_amount: 500,
  },
  {
    title: "Cozy Studio Near Capitol Hill",
    description:
      "Compact, furnished studio apartment a short walk from Capitol Hill — a good fit for a student or single professional. Includes a bed, wardrobe, and small kitchenette. Shared backup generator for the building.",
    category: "studio",
    usage_type: "residential",
    rent_amount: 200,
    rental_frequency: "monthly",
    county: "Montserrado",
    city: "Monrovia",
    community: "Capitol Hill",
    bedrooms: 1,
    bathrooms: 1,
    furnished: true,
    has_electricity: true,
    has_water: true,
    has_air_conditioning: false,
    has_parking: false,
    has_security: true,
    road_accessible: true,
    advance_rent_amount: 200,
    security_deposit_amount: 100,
  },
  {
    title: "Affordable Single Room in Gbarnga",
    description:
      "A clean, simply furnished single room in a quiet residential compound in Gbarnga. Shared bathroom and kitchen facilities with two other tenants. Good road access and close to the central market.",
    category: "room",
    usage_type: "residential",
    rent_amount: 80,
    rental_frequency: "monthly",
    county: "Bong",
    city: "Gbarnga",
    community: null,
    bedrooms: 1,
    bathrooms: 1,
    furnished: false,
    has_electricity: true,
    has_water: false,
    has_air_conditioning: false,
    has_parking: false,
    has_security: false,
    road_accessible: true,
    advance_rent_amount: 80,
    security_deposit_amount: 80,
  },
  {
    title: "Retail Shop on Tubman Street",
    description:
      "Ground-floor retail shop space on a busy commercial street in Buchanan, with high foot traffic and a roll-down security shutter. Open-plan layout, ready to fit out for a shop or small business.",
    category: "shop",
    usage_type: "commercial",
    rent_amount: 300,
    rental_frequency: "monthly",
    county: "Grand Bassa",
    city: "Buchanan",
    community: "Tubman Street",
    bedrooms: null,
    bathrooms: 1,
    furnished: false,
    has_electricity: true,
    has_water: false,
    has_air_conditioning: false,
    has_parking: true,
    has_security: true,
    road_accessible: true,
    advance_rent_amount: 300,
    security_deposit_amount: 300,
  },
  {
    title: "Serviced Office Space in Sinkor",
    description:
      "Two-room serviced office suite in a shared office compound in Sinkor, with a shared reception area and backup generator. Suited to a small team or a satellite office. On-street parking available out front.",
    category: "office",
    usage_type: "commercial",
    rent_amount: 450,
    rental_frequency: "monthly",
    county: "Montserrado",
    city: "Sinkor",
    community: "Tubman Boulevard",
    bedrooms: null,
    bathrooms: 1,
    furnished: false,
    has_electricity: true,
    has_water: true,
    has_air_conditioning: true,
    has_parking: true,
    has_security: true,
    road_accessible: true,
    advance_rent_amount: 450,
    security_deposit_amount: 450,
  },
];

function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

let created = 0;
let skipped = 0;

for (const listing of LISTINGS) {
  const slug = slugify(listing.title);

  const { data: existing } = await supabase.from("properties").select("id").eq("slug", slug).maybeSingle();
  if (existing) {
    skipped += 1;
    continue;
  }

  const { error } = await supabase.from("properties").insert({
    owner_id: ownerId,
    title: listing.title,
    slug,
    description: listing.description,
    category: listing.category,
    usage_type: listing.usage_type,
    rent_amount: listing.rent_amount,
    rental_frequency: listing.rental_frequency,
    county: listing.county,
    city: listing.city,
    community: listing.community,
    bedrooms: listing.bedrooms,
    bathrooms: listing.bathrooms,
    furnished: listing.furnished,
    has_electricity: listing.has_electricity,
    has_water: listing.has_water,
    has_air_conditioning: listing.has_air_conditioning,
    has_parking: listing.has_parking,
    has_security: listing.has_security,
    road_accessible: listing.road_accessible,
    advance_rent_amount: listing.advance_rent_amount,
    security_deposit_amount: listing.security_deposit_amount,
    listing_status: "published",
    availability_status: "available",
    published_at: now,
    last_availability_confirmed_at: now,
  });
  if (error) throw error;
  created += 1;
}

console.log(JSON.stringify({ ownerId, created, skipped, total: LISTINGS.length }, null, 2));

// Idempotent: seeds a fixed set of published placeholder listings owned by
// a clearly-labeled "231Rentals Listings Team" account, so the marketplace
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

// The project was renamed DomiLink -> 231Rentals and this constant was
// not. The lookup below matches on email, so the stale value missed the
// real demo owner and the script went on to create a *second* one --
// which would have split the showcase listings across two accounts,
// only one of them carrying the disclosure profile.
const DEMO_OWNER_EMAIL = "demo-listings@231rentals.app";

async function getOrCreateDemoOwner() {
  const { data: existing } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  const found = existing?.users?.find((u) => u.email === DEMO_OWNER_EMAIL);
  if (found) return found.id;

  const { data, error } = await supabase.auth.admin.createUser({
    email: DEMO_OWNER_EMAIL,
    password: `DemoOwner-${Math.random().toString(36).slice(2)}-${Date.now()}`,
    email_confirm: true,
    user_metadata: { display_name: "231Rentals Listings Team" },
  });
  if (error) throw error;
  return data.user.id;
}

const ownerId = await getOrCreateDemoOwner();

await supabase.from("user_roles").upsert({ user_id: ownerId, role: "owner" }, { onConflict: "user_id,role" });

await supabase.from("owner_profiles").upsert({
  user_id: ownerId,
  business_name: "231Rentals Listings Team",
  bio: "Example listings maintained by the 231Rentals team while real property owners come on board. These properties and their images are not real and are not available to rent — contact Help & Support with any questions.",
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
// --- Added 2026-11-20: more inventory so the homepage's themed rows
  // --- (city, county, furnished) have enough listings to build from.
  // --- `daysAgo` staggers published_at: every listing sharing one
  // --- timestamp made the whole grid read "listed 17 days ago" and made
  // --- "Recently listed" an arbitrary slice rather than an ordering.
  {
    title: "Three-Bedroom Bungalow in Congo Town",
    description:
      "Single-storey bungalow set back from Tubman Boulevard, with a walled compound and parking for two vehicles. Borehole water, and the compound runs a shared generator in the evenings. Within walking distance of shops and a clinic.",
    category: "house", usage_type: "residential", rent_amount: 650, rental_frequency: "monthly",
    county: "Montserrado", city: "Monrovia", community: "Congo Town",
    bedrooms: 3, bathrooms: 2, furnished: false,
    has_electricity: true, has_water: true, has_air_conditioning: true, has_parking: true,
    has_security: true, road_accessible: true, advance_rent_amount: 650, security_deposit_amount: 650,
    daysAgo: 1,
  },
  {
    title: "Furnished Apartment at Mamba Point",
    description:
      "Fully furnished one-bedroom apartment close to the embassies at Mamba Point. Air conditioning in the bedroom and living room, fitted kitchen, and a generator that covers the whole building. Suited to a short posting.",
    category: "apartment", usage_type: "residential", rent_amount: 900, rental_frequency: "monthly",
    county: "Montserrado", city: "Monrovia", community: "Mamba Point",
    bedrooms: 1, bathrooms: 1, furnished: true,
    has_electricity: true, has_water: true, has_air_conditioning: true, has_parking: true,
    has_security: true, road_accessible: true, advance_rent_amount: 1800, security_deposit_amount: 900,
    daysAgo: 2,
  },
  {
    title: "Self-Contained Room in Jallah Town",
    description:
      "Self-contained single room with its own bathroom and a small cooking area, on a compound with four other rooms. Shared water tank. Quiet street, close to a junction with regular taxis into central Monrovia.",
    category: "room", usage_type: "residential", rent_amount: 120, rental_frequency: "monthly",
    county: "Montserrado", city: "Monrovia", community: "Jallah Town",
    bedrooms: 1, bathrooms: 1, furnished: false,
    has_electricity: true, has_water: true, has_air_conditioning: false, has_parking: false,
    has_security: false, road_accessible: true, advance_rent_amount: 240, security_deposit_amount: 120,
    daysAgo: 3,
  },
  {
    title: "Shop Unit on Broad Street",
    description:
      "Ground-floor shop unit on Broad Street with a roll-up shutter and a storeroom at the back. Heavy foot traffic through the day. Electricity metered separately; tenant arranges their own backup.",
    category: "shop", usage_type: "commercial", rent_amount: 700, rental_frequency: "monthly",
    county: "Montserrado", city: "Monrovia", community: "Broad Street",
    bedrooms: null, bathrooms: 1, furnished: false,
    has_electricity: true, has_water: false, has_air_conditioning: false, has_parking: false,
    has_security: true, road_accessible: true, advance_rent_amount: 1400, security_deposit_amount: 700,
    daysAgo: 4,
  },
  {
    title: "Two-Bedroom Flat in Sinkor 12th Street",
    description:
      "First-floor flat on 12th Street, two bedrooms with built-in wardrobes and a tiled living area. Water tank on the roof, and the landlord maintains the compound gate. Walking distance to the beach road.",
    category: "apartment", usage_type: "residential", rent_amount: 420, rental_frequency: "monthly",
    county: "Montserrado", city: "Monrovia", community: "Sinkor",
    bedrooms: 2, bathrooms: 1, furnished: false,
    has_electricity: true, has_water: true, has_air_conditioning: false, has_parking: true,
    has_security: true, road_accessible: true, advance_rent_amount: 840, security_deposit_amount: 420,
    daysAgo: 5,
  },
  {
    title: "Compound House in Duport Road",
    description:
      "Four-bedroom house on its own walled compound off Duport Road, with a covered verandah and space for a garden. Well on site. Needs a tenant who will keep the yard; rent reflects that.",
    category: "house", usage_type: "residential", rent_amount: 450, rental_frequency: "monthly",
    county: "Montserrado", city: "Paynesville", community: "Duport Road",
    bedrooms: 4, bathrooms: 2, furnished: false,
    has_electricity: true, has_water: true, has_air_conditioning: false, has_parking: true,
    has_security: false, road_accessible: true, advance_rent_amount: 450, security_deposit_amount: 450,
    daysAgo: 6,
  },
  {
    title: "Furnished Two-Bedroom at ELWA Junction",
    description:
      "Furnished two-bedroom apartment a few minutes from ELWA Junction. Beds, wardrobes, sofa and a working fridge included. Air conditioning in both bedrooms. Good for a family arriving without household goods.",
    category: "apartment", usage_type: "residential", rent_amount: 550, rental_frequency: "monthly",
    county: "Montserrado", city: "Paynesville", community: "ELWA Junction",
    bedrooms: 2, bathrooms: 2, furnished: true,
    has_electricity: true, has_water: true, has_air_conditioning: true, has_parking: true,
    has_security: true, road_accessible: true, advance_rent_amount: 1100, security_deposit_amount: 550,
    daysAgo: 7,
  },
  {
    title: "Studio Near SKD Boulevard",
    description:
      "Studio room with a separate shower and toilet, on a small compound just off SKD Boulevard. Tiled floor, window onto the yard. Water from a shared tank, filled twice a week.",
    category: "studio", usage_type: "residential", rent_amount: 180, rental_frequency: "monthly",
    county: "Montserrado", city: "Paynesville", community: "SKD Boulevard",
    bedrooms: 1, bathrooms: 1, furnished: false,
    has_electricity: true, has_water: true, has_air_conditioning: false, has_parking: false,
    has_security: false, road_accessible: true, advance_rent_amount: 360, security_deposit_amount: 180,
    daysAgo: 8,
  },
  {
    title: "Office Suite in Paynesville Red Light",
    description:
      "Two-room office suite above a bank branch at Red Light, with its own entrance from the stairwell. Air conditioning in both rooms and a small reception area. Tenant shares the building generator.",
    category: "office", usage_type: "commercial", rent_amount: 600, rental_frequency: "monthly",
    county: "Montserrado", city: "Paynesville", community: "Red Light",
    bedrooms: null, bathrooms: 1, furnished: false,
    has_electricity: true, has_water: true, has_air_conditioning: true, has_parking: true,
    has_security: true, road_accessible: true, advance_rent_amount: 1200, security_deposit_amount: 600,
    daysAgo: 9,
  },
  {
    title: "Family Home in Paynesville Omega",
    description:
      "Three-bedroom home near the Omega tower, on a tarred access road. Separate kitchen building at the back, as is common on the compound. Reliable road access in the rainy season.",
    category: "house", usage_type: "residential", rent_amount: 380, rental_frequency: "monthly",
    county: "Montserrado", city: "Paynesville", community: "Omega",
    bedrooms: 3, bathrooms: 1, furnished: false,
    has_electricity: true, has_water: true, has_air_conditioning: false, has_parking: true,
    has_security: false, road_accessible: true, advance_rent_amount: 380, security_deposit_amount: 380,
    daysAgo: 10,
  },
  {
    title: "Beachside Two-Bedroom in Buchanan",
    description:
      "Two-bedroom house a short walk from the beach in Buchanan, with a shaded verandah facing the sea breeze. Quiet outside the harbour working hours. Generator point wired but no generator supplied.",
    category: "house", usage_type: "residential", rent_amount: 300, rental_frequency: "monthly",
    county: "Grand Bassa", city: "Buchanan", community: "Fanti Town",
    bedrooms: 2, bathrooms: 1, furnished: false,
    has_electricity: true, has_water: true, has_air_conditioning: false, has_parking: true,
    has_security: false, road_accessible: true, advance_rent_amount: 600, security_deposit_amount: 300,
    daysAgo: 11,
  },
  {
    title: "Furnished Room in Buchanan Centre",
    description:
      "Furnished single room in central Buchanan with a bed, table and fan. Shared bathroom with one other room. Month-to-month terms, suited to contract workers at the port.",
    category: "room", usage_type: "residential", rent_amount: 95, rental_frequency: "monthly",
    county: "Grand Bassa", city: "Buchanan", community: "Central Buchanan",
    bedrooms: 1, bathrooms: 1, furnished: true,
    has_electricity: true, has_water: true, has_air_conditioning: false, has_parking: false,
    has_security: false, road_accessible: true, advance_rent_amount: 190, security_deposit_amount: 95,
    daysAgo: 12,
  },
  {
    title: "Warehouse Space Near Buchanan Port",
    description:
      "Open warehouse space with a roller door wide enough for a container truck, on the approach road to Buchanan port. Concrete floor, metal roof, no internal partitions. Suited to storage rather than retail.",
    category: "shop", usage_type: "commercial", rent_amount: 850, rental_frequency: "monthly",
    county: "Grand Bassa", city: "Buchanan", community: "Port Road",
    bedrooms: null, bathrooms: 1, furnished: false,
    has_electricity: true, has_water: false, has_air_conditioning: false, has_parking: true,
    has_security: true, road_accessible: true, advance_rent_amount: 1700, security_deposit_amount: 850,
    daysAgo: 13,
  },
  {
    title: "Two-Bedroom Apartment in Gbarnga",
    description:
      "Two-bedroom apartment on the Gbarnga highway side, with a tiled sitting room and a small back yard. Close to Cuttington University traffic, so the road is busy during term.",
    category: "apartment", usage_type: "residential", rent_amount: 220, rental_frequency: "monthly",
    county: "Bong", city: "Gbarnga", community: "Gbarnga Highway",
    bedrooms: 2, bathrooms: 1, furnished: false,
    has_electricity: true, has_water: true, has_air_conditioning: false, has_parking: true,
    has_security: false, road_accessible: true, advance_rent_amount: 440, security_deposit_amount: 220,
    daysAgo: 14,
  },
  {
    title: "Shop Front on Gbarnga Main Road",
    description:
      "Shop front on the main road through Gbarnga, with display frontage and a lockable store at the rear. Market days bring steady traffic past the door.",
    category: "shop", usage_type: "commercial", rent_amount: 260, rental_frequency: "monthly",
    county: "Bong", city: "Gbarnga", community: "Main Road",
    bedrooms: null, bathrooms: 1, furnished: false,
    has_electricity: true, has_water: false, has_air_conditioning: false, has_parking: false,
    has_security: false, road_accessible: true, advance_rent_amount: 520, security_deposit_amount: 260,
    daysAgo: 15,
  },
  {
    title: "Three-Bedroom House in Kakata",
    description:
      "Three-bedroom house on a residential street in Kakata, with a fenced yard and fruit trees. Water from a hand pump on the compound. Half an hour from the Firestone plantation gate.",
    category: "house", usage_type: "residential", rent_amount: 280, rental_frequency: "monthly",
    county: "Margibi", city: "Kakata", community: "Kakata Town",
    bedrooms: 3, bathrooms: 1, furnished: false,
    has_electricity: true, has_water: true, has_air_conditioning: false, has_parking: true,
    has_security: false, road_accessible: true, advance_rent_amount: 560, security_deposit_amount: 280,
    daysAgo: 16,
  },
  {
    title: "Furnished Studio in Kakata",
    description:
      "Furnished studio with a bed, wardrobe and two-burner stove, on a compound with a shared tap. Rent includes the compound's water. Walking distance to the market.",
    category: "studio", usage_type: "residential", rent_amount: 140, rental_frequency: "monthly",
    county: "Margibi", city: "Kakata", community: "Market Area",
    bedrooms: 1, bathrooms: 1, furnished: true,
    has_electricity: true, has_water: true, has_air_conditioning: false, has_parking: false,
    has_security: false, road_accessible: true, advance_rent_amount: 280, security_deposit_amount: 140,
    daysAgo: 18,
  },
  {
    title: "Roadside Office in Kakata",
    description:
      "Small two-room office on the roadside in Kakata, previously used by an agricultural co-operative. Metered electricity, and a water tank shared with the neighbouring unit.",
    category: "office", usage_type: "commercial", rent_amount: 200, rental_frequency: "monthly",
    county: "Margibi", city: "Kakata", community: "Kakata Town",
    bedrooms: null, bathrooms: 1, furnished: false,
    has_electricity: true, has_water: true, has_air_conditioning: false, has_parking: true,
    has_security: false, road_accessible: true, advance_rent_amount: 400, security_deposit_amount: 200,
    daysAgo: 20,
  },
  {
    title: "Two-Bedroom House in Ganta",
    description:
      "Two-bedroom house near the Ganta border crossing, on a compound with a shared well. Concrete block build with a zinc roof. Traders passing to Guinea keep the area busy.",
    category: "house", usage_type: "residential", rent_amount: 240, rental_frequency: "monthly",
    county: "Nimba", city: "Ganta", community: "Ganta Town",
    bedrooms: 2, bathrooms: 1, furnished: false,
    has_electricity: true, has_water: true, has_air_conditioning: false, has_parking: true,
    has_security: false, road_accessible: true, advance_rent_amount: 480, security_deposit_amount: 240,
    daysAgo: 22,
  },
  {
    title: "Single Room in Ganta",
    description:
      "Single room on a family compound in Ganta, with shared bathroom and cooking area. Rent is monthly and the landlord lives on site. Suited to one person.",
    category: "room", usage_type: "residential", rent_amount: 70, rental_frequency: "monthly",
    county: "Nimba", city: "Ganta", community: "Ganta Town",
    bedrooms: 1, bathrooms: 1, furnished: false,
    has_electricity: true, has_water: true, has_air_conditioning: false, has_parking: false,
    has_security: false, road_accessible: true, advance_rent_amount: 140, security_deposit_amount: 70,
    daysAgo: 24,
  },
  {
    title: "Furnished Apartment in Ganta Centre",
    description:
      "Furnished one-bedroom apartment above a shop in central Ganta. Bed, wardrobe, table and chairs included, with a fan in the bedroom. Noise from the street until the shops close.",
    category: "apartment", usage_type: "residential", rent_amount: 190, rental_frequency: "monthly",
    county: "Nimba", city: "Ganta", community: "Central Ganta",
    bedrooms: 1, bathrooms: 1, furnished: true,
    has_electricity: true, has_water: true, has_air_conditioning: false, has_parking: false,
    has_security: false, road_accessible: true, advance_rent_amount: 380, security_deposit_amount: 190,
    daysAgo: 26,
  },
];

function daysAgoIso(days) {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
}

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
    // Everything shared one timestamp, so the whole grid read "listed 17
    // days ago" and "Recently listed" was an arbitrary slice rather than
    // an ordering. Listings without an explicit daysAgo keep the old
    // behaviour so re-running this does not reshuffle what exists.
    published_at: listing.daysAgo === undefined ? now : daysAgoIso(listing.daysAgo),
    last_availability_confirmed_at: now,
    // Disclosed in the UI as a "Showcase listing" badge. Never set for a
    // listing created by a real owner.
    is_showcase: true,
  });
  if (error) throw error;
  created += 1;
}

console.log(JSON.stringify({ ownerId, created, skipped, total: LISTINGS.length }, null, 2));

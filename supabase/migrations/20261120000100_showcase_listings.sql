-- Mark a listing as placeholder inventory maintained by the team.
--
-- The marketplace carries a small set of seeded listings so that a
-- visitor does not land on an empty page while real owners come on
-- board. That is the one sanctioned exception to CLAUDE.md rule #9, and
-- it only stays honest while it is disclosed.
--
-- Until now the disclosure lived on the demo account's owner profile --
-- a bio a renter sees only if they open the owner, which nobody does
-- while scanning a grid. Once those listings carry photographs the gap
-- matters more: a stock photograph of a building reads as a photograph
-- of *this* building unless something says otherwise.
--
-- So the state becomes a column the UI can render, rather than
-- something inferred from an owner id hardcoded in the app. It defaults
-- to false, so a real owner's listing is never marked, and the badge
-- disappears from the site on its own as real inventory replaces this.
alter table public.properties
  add column if not exists is_showcase boolean not null default false;

comment on column public.properties.is_showcase is
  'Team-maintained placeholder listing, not a real property. Rendered as a visible "Showcase listing" badge. Never set for owner-created listings.';

-- Backfill the listings already seeded, found through the demo owner's
-- profile rather than a literal uuid so this reads correctly in any
-- environment where the seed has been run.
update public.properties p
set is_showcase = true
from public.owner_profiles op
where op.user_id = p.owner_id
  and op.business_name in ('DomiLink Listings Team', '231Rentals Listings Team');

-- Partial index: the homepage and search never filter on this, but the
-- admin "what is still placeholder" question gets asked against a table
-- that is mostly real listings, and this keeps that cheap as the real
-- ones grow.
create index if not exists properties_showcase_idx
  on public.properties (created_at desc)
  where is_showcase;

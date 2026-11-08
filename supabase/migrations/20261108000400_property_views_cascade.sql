-- property_views.viewer_id had no ON DELETE behavior at all (defaults to
-- RESTRICT), the only user-reference in the schema that isn't either
-- CASCADE or a deliberate RESTRICT (audit logs, reviewer/manager
-- references). A view-count row is pure analytics with no reason to
-- block deleting the user who made it -- found when manually deleting a
-- disposable test account failed on this FK.
alter table public.property_views
  drop constraint property_views_viewer_id_fkey,
  add constraint property_views_viewer_id_fkey
    foreign key (viewer_id) references auth.users (id) on delete cascade;

-- Storage bucket for property photos. Public-read (listing photos are
-- meant to be publicly visible), write-restricted to the owning property's
-- owner/manager via a path convention of `{property_id}/{filename}`.
-- Verification documents (Milestone 6) get a SEPARATE, private bucket —
-- never mix public listing photos with private identity/ownership docs.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'property-images', 'property-images', true, 8388608,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

create policy property_images_bucket_read on storage.objects
  for select
  to anon, authenticated
  using (bucket_id = 'property-images');

create policy property_images_bucket_write on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'property-images'
    and exists (
      select 1 from public.properties p
      where p.id::text = (storage.foldername(name))[1]
        and (p.owner_id = auth.uid() or p.manager_id = auth.uid())
    )
  );

create policy property_images_bucket_update on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'property-images'
    and exists (
      select 1 from public.properties p
      where p.id::text = (storage.foldername(name))[1]
        and (p.owner_id = auth.uid() or p.manager_id = auth.uid())
    )
  );

create policy property_images_bucket_delete on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'property-images'
    and exists (
      select 1 from public.properties p
      where p.id::text = (storage.foldername(name))[1]
        and (p.owner_id = auth.uid() or p.manager_id = auth.uid())
    )
  );

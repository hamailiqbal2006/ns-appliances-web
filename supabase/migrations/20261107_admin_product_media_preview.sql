-- Permit an approved administrator to preview draft and archived product media
-- through /api/product-media. Public reads remain limited to active products.
-- This is intentionally narrower than a global authenticated read policy.

drop policy if exists "Admins read product media" on storage.objects;
create policy "Admins read product media" on storage.objects
for select to authenticated
using (bucket_id = 'product-images' and public.is_admin());

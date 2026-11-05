-- Secure product media and enable the existing optional MP4/WebM gallery.
-- Run after 20261027_product_gallery_and_reviews.sql.

-- Storage object URLs must not stay public after a product is deactivated.
-- Public reads go through the app's /api/product-media route, where this RLS
-- policy confirms the object belongs to an active product.
update storage.buckets
set
  public = false,
  file_size_limit = 20971520,
  allowed_mime_types = array[
    'image/jpeg', 'image/png', 'image/webp', 'video/mp4', 'video/webm'
  ]
where id = 'product-images';

drop policy if exists "Public reads active product media" on storage.objects;
create policy "Public reads active product media" on storage.objects
for select to anon, authenticated using (
  bucket_id = 'product-images'
  and exists (
    select 1
    from public.product_images as media
    join public.products as product on product.id = media.product_id
    where media.storage_path = storage.objects.name
      and product.status = 'active'
  )
);

-- Existing admin-only INSERT/UPDATE/DELETE policy remains in force. The
-- product_images table itself already allows public reads only for active
-- products, and authenticated admins retain full edit access.

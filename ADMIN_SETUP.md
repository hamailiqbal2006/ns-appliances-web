# NS Admin V1 setup

The admin portal lives at `/admin` in this same Next.js project. It intentionally
starts fail-closed: without a configured Supabase project, `/admin` redirects to
`/admin/login` and sign-in cannot succeed.

## Free Supabase connection

1. Create a free Supabase project. No hosting purchase is needed for this step.
2. In its SQL Editor, run these migrations in order, once each:

   1. `supabase/migrations/20261025_admin_v1.sql`
   2. `supabase/migrations/20261025_reservations_and_public_catalog.sql`
   3. `supabase/migrations/20261027_categories_management.sql`
   4. `supabase/migrations/20261027_product_gallery_and_reviews.sql`
   5. `supabase/migrations/20261028_contact_inquiries.sql`
   6. `supabase/migrations/20261029_announcement_bar.sql`
   7. `supabase/migrations/20261029_announcement_bar_customization.sql`
   8. `supabase/migrations/20261029_homepage_banners.sql`
   9. `supabase/migrations/20261030_welcome_popup_leads.sql`
   10. `supabase/migrations/20261030_product_availability.sql`
   11. `supabase/migrations/20261031_retire_reservations_safely.sql` (Decommissions reservations safely while preserving historical data)
   12. `supabase/migrations/20261106_dual_responsive_banners.sql` (Dual desktop and mobile banner artwork paths)
   13. `supabase/migrations/20261106_homepage_slider_settings.sql` (Configurable banner quantity and transition interval)
   14. `supabase/migrations/20261108_homepage_banner_redesign.sql` (Up to 10 banners, custom titles, arbitrary slots, unified atomic save)
3. In Supabase Auth, create or invite the owner account. Keep public sign-up off.
4. Replace the example email in the final commented block of that SQL file with
   the owner's exact Auth email, then run that one promotion statement. This is
   the explicit admin allowlist; an ordinary signed-in user is not an admin.
5. Copy `.env.example` to an ignored `.env.local`, then add only:

   ```text
   SUPABASE_URL=https://your-project.supabase.co
   SUPABASE_PUBLISHABLE_KEY=your-publishable-or-anon-key
   ```

   Do not add a service-role key. The portal validates the Supabase user and
   admin role on the server for every protected page and mutation.
6. Restart the Next.js server and visit `/admin/login`.

## Password recovery

Use **Forgot your password?** on `/admin/login`; it requests Supabase recovery with an explicit reset destination instead of relying on Supabase's default Site URL. During local development the destination is always `http://localhost:3000/admin/reset-password`.

In **Supabase Dashboard → Authentication → URL Configuration**, set the Site URL to `http://localhost:3000` for this local setup and add this exact Redirect URL:

```text
http://localhost:3000/admin/reset-password
```

Use the same host consistently; do not mix `localhost` and `127.0.0.1`. For a deployed site, set `SITE_URL` to its HTTPS origin and add the corresponding exact `/admin/reset-password` URL in Supabase before requesting a recovery email. Recovery responses are generic so the portal does not disclose which email addresses are approved.

Admin sessions are intentionally short-lived (one hour) and fail closed when
the access token expires. Sign in again rather than storing a long-lived
refresh credential in the application cookie jar.

## Catalog and customer inquiry behavior

- Approved admins can create, edit, delete, and upload validated product records.
- Only an `active` product record is published to the public catalog, its product
  URL, its assigned category route, and the site search. `draft` and `archived`
  records are not readable to visitors under RLS. An active record with the same
  slug as a legacy placeholder replaces that placeholder view rather than creating
  a duplicate public product.
- Published database products feature a direct "Inquire About This Product" action
  that connects to the customer inquiry system. Customers can ask questions, verify
  current showroom stock, and coordinate visits without online booking or advance payment.
- Customer inquiries submitted through the Contact & Inquiries page (`/contact`) are protected by RLS and a rate-limiting RPC. Public visitors cannot query or tamper with submissions. Approved store managers can view, review, and resolve inquiries in `/admin/inquiries`.
- Existing static showroom entries remain available if Supabase is unconfigured
  or temporarily unavailable. They do not expose a reservation form because
  they are not database-published product records.

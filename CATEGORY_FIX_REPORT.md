# Category management repair — 22 November 2026

Baseline: `c658f19f6b556283bc23b1a190fee3c3d9289fd5`.
Repair branch: `fix/category-lifecycle-and-admin-layout`.
Rollback branch: `rollback/category-fixes-20261122`.

## Confirmed defects and corrections

| Defect | Correction |
| --- | --- |
| Successful category saves displayed `NEXT_REDIRECT`. | Navigation now happens outside the mutation's error handler. |
| Saving an active category archived it. | The server accepts the form's `true`/`false` switch values, with legacy `on` compatibility. |
| Deleted/archived categories remained in homepage scenes. | Preserve the existing artwork and editorial groups; derive their category links and order from active database records. Empty groups disappear from the public scene list. |
| An empty or unavailable managed catalog restored demo categories. | Demo categories are used only when Supabase is unconfigured. A managed empty/error result cannot resurrect removed records. |
| New categories did not appear in search; removed categories reappeared there. | Search uses live category names and slugs while retaining supported Roman Urdu intent matching. Client search no longer temporarily substitutes the fixed demo catalog. |
| Category routes could resolve removed/invalid slugs to the first unrelated category. | Validate the requested category/group/subcategory and return not-found for invalid routes. |
| Archived/deleted category products could be reassigned to another visible category. | Filter managed products by a real active category assignment. Connected catalogs cannot restore missing demo product detail pages. |
| Editing category names regenerated existing subcategory slugs. | Retain existing slugs and expose the supported `Name:slug` format when editing. Duplicate subcategory slugs are rejected. |
| Invalid category display order values were silently truncated. | Require a non-negative integer within the database integer range. |
| Failed/no-op deletions and updates could appear successful. | Require returned affected records; show failures inline. Product assignment checks fail closed and include legacy category aliases. |
| Category slug changes could orphan assigned products. | Block slug changes when products are assigned or their count cannot be verified; display-name changes remain supported. |
| The category table forced a 1,260 px minimum width inside a narrower panel. | Add category-specific column sizing and wrapping. Preserve contained horizontal scrolling for smaller screens and keyboard access to that region. |
| Category edits did not expire all affected cached data. | Invalidate category, public-product, and showcase tags and affected admin/public routes together. |

## Verification

- `npm test`: 15 regression tests exercise the real server action/data modules with simulated HTTP and Next.js boundaries. No production records are used.
- TypeScript and full-project ESLint checks were run.
- The production webpack build completed successfully using the existing app's cached Google Font files through Next.js's test-response setting. The production source still uses its original fonts; no font or palette changes are included.
- A normal network-backed build could not fetch Google Fonts in the managed execution environment.
- Local browser preview access was unavailable in this environment. Live responsive inspection must be completed after deployment; this report does not claim an interactive production create/delete test.

## Scope and deployment

No dependency upgrades, new paid services, credentials, authentication changes, database schema changes, or production category deletions are included. Existing archived categories remain archived. The original local checkout is preserved.

Deploy the complete repair branch together. Do not deploy intermediate directory-upload commits independently. Roll back to the checkpoint branch if needed.

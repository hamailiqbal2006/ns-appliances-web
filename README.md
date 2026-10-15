# NS Home Appliances

Product-led digital showroom for a physical NS Appliances store in Pakistan. This V1 is a browse-and-book experience, not a cart or checkout.

## Stack

- Next.js App Router, React and TypeScript
- Tailwind CSS 4 for tokens/resets, with authored component CSS
- GSAP + ScrollTrigger for the pinned story sequences
- Motion for local product hover/tap behavior
- Base UI is available for future accessible primitives

## Content architecture

`src/data/catalog.ts` is the single source of temporary product/category media and art direction. Replace files in `public/products/temp/` and adjust each image's `scale`, `x`, `y`, and optional `rotation` when real NS product photography arrives.

No price, rating, stock, warranty, contact number, or unverified specification is included.

## Run

```bash
npm run dev
npm run lint
npm run build
```

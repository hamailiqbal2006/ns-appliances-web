"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { StorefrontProduct } from "@/lib/public-catalog";
import { SiteNav } from "@/components/site-nav";
import { SiteFooter } from "@/components/site-footer";

gsap.registerPlugin(ScrollTrigger);

const css = (values: Record<string, string | number>) => values as React.CSSProperties;

export function ProductStory({ product }: { product: StorefrontProduct }) {
  const root = useRef<HTMLDivElement>(null);
  const [state, setState] = useState(0);
  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const ctx = gsap.context(() => {
      ScrollTrigger.create({ trigger: ".story-track", start: "top top", end: "bottom bottom", scrub: true, onUpdate: ({ progress }) => setState(Math.min(3, Math.floor(progress * 4 + .001))) });
    }, root);
    return () => ctx.revert();
  }, []);
  const steps = ["Introduction", "Material", "Detail", "Specification"];
  const inquiryUrl = `/contact?product=${encodeURIComponent(product.name)}&id=${encodeURIComponent(product.id)}&slug=${encodeURIComponent(product.slug)}`;

  return <div className="product-story" ref={root} style={css({ "--detail-base": product.palette.base, "--detail-panel": product.palette.panel, "--detail-ink": product.palette.ink, "--detail-accent": product.palette.accent })}>
    <SiteNav detail />
    <main>
      <section className="story-track" style={{ height: "430svh" }}>
        <div className={`story-hero state-${state}`}>
          <p className="story-word" aria-hidden>{product.name.split(" ").slice(-1)}</p>
          <div className="story-meta story-meta-left"><span>Category</span><b>{product.category}</b><span>Availability</span><b>Showroom Collection</b></div>
          <div className="story-product">{product.image ? product.image.startsWith("/") ? <Image src={product.image} alt={`${product.name} product`} fill priority sizes="(max-width: 760px) 86vw, 52vw" style={{ objectFit: "contain", transform: `translate(${product.art.x}%, ${product.art.y}%) scale(${product.art.scale}) rotate(${product.art.rotation ?? 0}deg)` }} /> : (
            // eslint-disable-next-line @next/next/no-img-element -- Supabase project host is owner-configured.
            <img src={product.image} alt={product.name} className="story-upload-image" />
          ) : <span className="story-image-empty">Product image pending</span>}</div>
          <div className="story-meta story-meta-right"><span>Product</span><b>{[product.brand, product.modelNumber].filter(Boolean).join(" · ") || product.kind}</b><span>Showroom</span><b>Visit to Inspect</b></div>
          <div className="story-bottom"><p>{steps[state]}</p><a href="#inquiry">Inquire About Appliance <span>↗</span></a></div>
        </div>
      </section>
      <section id="inquiry" className="feature-deck">
        <p className="eyebrow">Product Information</p>
        <div className="feature-row"><h2>{product.source === "managed" ? "Published product\ninformation." : <>Built for the<br /><em>real product.</em></>}</h2><p>{product.description ?? "Curated appliance engineered for everyday performance and lasting comfort."}</p></div>
        <div className="feature-row inverse">
          <h2>Specifications &amp;<br /><em>Features.</em></h2>
          <div>
            {Object.keys(product.specifications).length ? (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "10px", marginTop: "12px" }}>
                {Object.entries(product.specifications).map(([label, value]) => (
                  <div key={label} style={{ background: "rgba(255,255,255,0.06)", padding: "10px 14px", borderRadius: "6px" }}>
                    <div style={{ fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.06em", opacity: 0.65 }}>{label}</div>
                    <div style={{ fontSize: "14px", fontWeight: 600, marginTop: "2px" }}>{value}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p>{product.source === "managed" ? "Official specification sheet will be confirmed by showroom staff." : "Confirmed specifications and features available upon showroom inspection."}</p>
            )}
          </div>
        </div>
        <div className="feature-row"><h2>Pricing &amp;<br /><em>Inquiry.</em></h2><p>{product.pricePkr !== null ? `Price: PKR ${new Intl.NumberFormat("en-PK").format(product.pricePkr)}.` : "Price confirmed upon showroom inquiry or contact with our team."}</p></div>
        <div style={{ marginTop: "24px" }}>
          <Link href={inquiryUrl} className="story-return" style={{ fontSize: "13px", padding: "12px 24px", background: "#FAF9F7", color: "#111618", borderRadius: "8px", textDecoration: "none", fontWeight: 600 }}>
            Inquire About This Product <span>&rarr;</span>
          </Link>
        </div>
        <div style={{ display: "flex", gap: "20px", marginTop: "24px", flexWrap: "wrap" }}>
          <Link className="story-return" href={`/products?category=${product.categorySlug}`}>Browse {product.category} <span>&rarr;</span></Link>
          <Link className="story-return" href="/products">All Products Catalog <span>&rarr;</span></Link>
        </div>
      </section>
    </main>
    <SiteFooter />
  </div>;
}

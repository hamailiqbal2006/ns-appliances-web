"use client";

import Image from "next/image";
import Link from "next/link";
import { useLayoutEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import type { Product } from "@/data/catalog";
import { SiteNav } from "@/components/site-nav";

gsap.registerPlugin(ScrollTrigger);

const css = (values: Record<string, string | number>) => values as React.CSSProperties;

export function ProductStory({ product }: { product: Product }) {
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
  return <div className="product-story" ref={root} style={css({ "--detail-base": product.palette.base, "--detail-panel": product.palette.panel, "--detail-ink": product.palette.ink, "--detail-accent": product.palette.accent })}>
    <SiteNav detail />
    <main>
      <section className="story-track" style={{ height: "430svh" }}>
        <div className={`story-hero state-${state}`}>
          <p className="story-word" aria-hidden>{product.name.split(" ").slice(-1)}</p>
          <div className="story-meta story-meta-left"><span>Category</span><b>{product.category}</b><span>Showroom state</span><b>Temporary media</b></div>
          <div className="story-product"><Image src={product.image} alt={`Temporary ${product.name} product cutout`} fill priority sizes="(max-width: 760px) 86vw, 52vw" style={{ objectFit: "contain", transform: `translate(${product.art.x}%, ${product.art.y}%) scale(${product.art.scale}) rotate(${product.art.rotation ?? 0}deg)` }} /></div>
          <div className="story-meta story-meta-right"><span>Product</span><b>{product.kind}</b><span>Availability</span><b>Confirm in store</b></div>
          <div className="story-bottom"><p>0{state + 1} / 04 · {steps[state]}</p><a href="#booking">Book This Product <span>↗</span></a></div>
        </div>
      </section>
      <section id="booking" className="feature-deck">
        <p className="eyebrow">Product story / information framework</p>
        <div className="feature-row"><span>01</span><h2>Built for the<br /><em>real product.</em></h2><p>This visual story is deliberately data-led. Replace the temporary cutout and add confirmed NS model data without reworking the composition.</p></div>
        <div className="feature-row inverse"><span>02</span><h2>Feature<br /><em>callouts.</em></h2><p>Confirmed close-ups and product benefits will live here as editorial panels rather than a conventional gallery and sidebar.</p></div>
        <div className="feature-row"><span>03</span><h2>Specifications,<br /><em>when verified.</em></h2><p>No made-up capacity, efficiency, warranty or price is shown. These slots are ready for the official product sheet.</p></div>
        <Link className="story-return" href="/#categories">Return to showroom <span>↑</span></Link>
      </section>
    </main>
  </div>;
}

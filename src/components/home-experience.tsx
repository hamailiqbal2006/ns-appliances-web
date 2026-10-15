"use client";

import Image from "next/image";
import Link from "next/link";
import { LayoutGroup, motion, useReducedMotion, useScroll, useTransform } from "motion/react";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { categories, products } from "@/data/catalog";
import { SiteNav } from "@/components/site-nav";

gsap.registerPlugin(ScrollTrigger);

const css = (values: Record<string, string | number>) => values as React.CSSProperties;

const subscribeToHeroDock = (callback: () => void) => {
  window.addEventListener("scroll", callback, { passive: true });
  return () => window.removeEventListener("scroll", callback);
};

const getHeroDockSnapshot = () => window.scrollY >= 126;
const getHeroDockServerSnapshot = () => false;

export function HomeExperience() {
  const root = useRef<HTMLDivElement>(null);
  const categoryTrack = useRef<HTMLElement>(null);
  const productTrack = useRef<HTMLElement>(null);
  const rail = useRef<HTMLDivElement>(null);
  const [activeHero, setActiveHero] = useState(0);
  const [activeCategory, setActiveCategory] = useState(0);
  const [activeProduct, setActiveProduct] = useState(0);
  const [hasHeroTitleEntered, setHasHeroTitleEntered] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const isHeroTitleDocked = useSyncExternalStore(
    subscribeToHeroDock,
    getHeroDockSnapshot,
    getHeroDockServerSnapshot
  );
  const { scrollY } = useScroll();
  const heroTitleY = useTransform(scrollY, (value) => {
    if (shouldReduceMotion) return 0;
    const progress = Math.min(value / 126, 1);
    const viewportHeight = typeof window === "undefined" ? 900 : window.innerHeight;
    return -(viewportHeight * 0.4 * progress);
  });
  const heroTitleScale = useTransform(scrollY, (value) => {
    if (shouldReduceMotion) return 1;
    const viewportWidth = typeof window === "undefined" ? 1440 : window.innerWidth;
    const compactScale = viewportWidth <= 760 ? 0.29 : 0.14;
    return 1 - (1 - compactScale) * Math.min(value / 126, 1);
  });

  useLayoutEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const context = gsap.context(() => {
      const indexFrom = (progress: number, size: number) => Math.min(size - 1, Math.floor(progress * size + 0.0001));
      if (categoryTrack.current) ScrollTrigger.create({
        trigger: categoryTrack.current, start: "top top", end: "bottom bottom", scrub: true,
        onUpdate: ({ progress }) => setActiveCategory(indexFrom(progress, categories.length)),
      });
      if (productTrack.current) ScrollTrigger.create({
        trigger: productTrack.current, start: "top top", end: "bottom bottom", scrub: true,
        onUpdate: ({ progress }) => setActiveProduct(indexFrom(progress, products.length)),
      });
    }, root);
    return () => context.revert();
  }, []);

  useEffect(() => {
    const node = rail.current;
    if (!node) return;
    const update = () => {
      const center = node.scrollLeft + node.clientWidth / 2;
      const next = Array.from(node.children).reduce((best, child, index) => {
        const item = child as HTMLElement;
        const distance = Math.abs(item.offsetLeft + item.offsetWidth / 2 - center);
        return distance < best.distance ? { index, distance } : best;
      }, { index: 0, distance: Infinity }).index;
      setActiveHero(next);
    };
    node.addEventListener("scroll", update, { passive: true });
    update();
    return () => node.removeEventListener("scroll", update);
  }, []);

  const category = categories[activeCategory];
  const product = products[activeProduct];

  return <LayoutGroup id="home-navigation"><div className="showroom" ref={root}>
    <SiteNav heroTitleDocked={isHeroTitleDocked} />
    <main>
      <section className="hero-track" aria-label="NS Home Appliances showroom introduction">
        <div className="hero-stage">
          <div className="hero-ambient" aria-hidden />
          {!isHeroTitleDocked && (
            <div className="hero-title-anchor">
              <motion.div
                className="hero-title-reveal"
                initial={shouldReduceMotion || hasHeroTitleEntered ? false : { opacity: 0, y: 18, clipPath: "inset(0 0 100% 0)" }}
                animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)" }}
                transition={{ duration: shouldReduceMotion ? 0.001 : 0.82, delay: shouldReduceMotion ? 0 : 0.12, ease: [0.22, 1, 0.36, 1] }}
                onAnimationComplete={() => setHasHeroTitleEntered(true)}
              >
                <motion.h1
                  id="hero-title"
                  layoutId="ns-home-title"
                  className="hero-title"
                  style={{ y: heroTitleY, scale: heroTitleScale }}
                  transition={{ layout: { duration: shouldReduceMotion ? 0.001 : 0.42, ease: [0.22, 1, 0.36, 1] } }}
                >
                  NS Home Appliances
                </motion.h1>
              </motion.div>
            </div>
          )}
          <p className="hero-index">Scroll to enter <span>↓</span></p>
          <div className="product-rail" ref={rail} aria-label="Featured temporary products">
            {products.map((item, index) => <motion.button key={item.slug} className={`hero-product ${activeHero === index ? "is-active" : ""}`} onMouseEnter={() => setActiveHero(index)} onFocus={() => setActiveHero(index)} whileHover={{ y: -18 }} whileTap={{ scale: 0.98 }} aria-label={`Explore ${item.name}`}>
              <span className="sr-only">{item.name}</span>
              <Image src={item.image} alt="Temporary product cutout" fill sizes="(max-width: 700px) 45vw, 20vw" priority={index < 2} style={{ objectFit: "contain", transform: `translate(${item.art.x}%, ${item.art.y}%) scale(${item.art.scale}) rotate(${item.art.rotation ?? 0}deg)` }} />
            </motion.button>)}
          </div>
        </div>
      </section>

      <section className="category-intro cover-panel" aria-labelledby="category-intro-title">
        <div className="intro-sticky"><p className="eyebrow">01 / discover by room</p><h2 id="category-intro-title">Shop by<br /><em>Category</em></h2><p>Objects for a calmer, more capable home.</p><span className="intro-arrow" aria-hidden>↓</span></div>
      </section>

      <section id="categories" className="category-track cover-panel" ref={categoryTrack} aria-label="Shop by category" style={{ height: `${categories.length * 105}svh` }}>
        <div className="category-scene" style={css({ "--scene-base": category.palette.base, "--scene-panel": category.palette.panel, "--scene-ink": category.palette.ink })}>
          <div className="category-left"><p className="scene-number">0{activeCategory + 1} / 04</p><h2>{category.name}</h2><p className="category-signal">Scroll-led selection</p></div>
          <div className="category-cutout"><Image key={category.slug} src={category.image} alt={`Temporary ${category.name} appliance cutout`} fill sizes="(max-width: 760px) 85vw, 46vw" style={{ objectFit: "contain", transform: `translate(${category.art.x}%, ${category.art.y}%) scale(${category.art.scale}) rotate(${category.art.rotation ?? 0}deg)` }} /></div>
          <div className="category-right"><p className="eyebrow">Explore</p><ul>{category.subcategories.map((sub, index) => <li key={sub.slug}><Link href={`/category/${category.slug}/${sub.slug}`}><span>0{index + 1}</span>{sub.name}<b>↗</b></Link></li>)}</ul><p className="temporary-note">Temporary cutout / final NS product image to replace</p></div>
          <div className="scene-dots" aria-hidden>{categories.map((_, index) => <i key={index} className={index === activeCategory ? "active" : ""} />)}</div>
        </div>
      </section>

      <section id="products" className="products-track cover-panel" ref={productTrack} aria-labelledby="products-heading" style={{ height: `${products.length * 110}svh` }}>
        <div className="product-scene" style={css({ "--product-base": product.palette.base, "--product-panel": product.palette.panel, "--product-ink": product.palette.ink, "--product-accent": product.palette.accent })}>
          <div className="product-visual"><Link href={`/products/${product.slug}`} aria-label={`View ${product.name}`}><Image key={product.slug} src={product.image} alt={`Temporary ${product.name} cutout`} fill sizes="(max-width: 760px) 85vw, 52vw" style={{ objectFit: "contain", transform: `translate(${product.art.x}%, ${product.art.y}%) scale(${product.art.scale}) rotate(${product.art.rotation ?? 0}deg)` }} /></Link></div>
          <div className="product-info"><p className="eyebrow">02 / product {String(activeProduct + 1).padStart(2, "0")}</p><p className="product-kind">{product.kind}</p><h2 id="products-heading">{product.name}</h2><p>{product.note}</p><Link className="view-product" href={`/products/${product.slug}`}>View product <span>↗</span></Link></div>
          <div className="product-pagination" aria-label="Product sequence">{products.map((item, index) => <button onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })} key={item.slug} className={index === activeProduct ? "active" : ""} aria-label={`Product ${index + 1}`} />)}</div>
        </div>
      </section>

      <section id="visit" className="visit-panel cover-panel"><p className="eyebrow">03 / next step</p><h2>See it<br /><em>in person.</em></h2><p>This digital showroom is ready for real inventory, model information, booking contact details and the final NS Appliances photography.</p><a href="#hero-title">Back to the collection <span>↑</span></a></section>
    </main>
  </div></LayoutGroup>;
}

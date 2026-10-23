"use client";

import { useEffect, useRef } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

export function SmoothScroll() {
  const lenisRef = useRef<Lenis | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // Honor reduced-motion preference
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    gsap.registerPlugin(ScrollTrigger);

    // Initialize Lenis with responsive, restrained easing for butter-smooth scrolling
    const lenis = new Lenis({
      duration: 0.85, // Crisp, responsive duration that settles promptly without floaty drift
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential ease-out
      orientation: "vertical",
      gestureOrientation: "vertical",
      smoothWheel: true,
      syncTouch: false, // 100% native momentum scrolling on mobile devices
      wheelMultiplier: 1.0, // Standard 1:1 wheel distance
      touchMultiplier: 1.0,
      autoRaf: false, // Unified single RAF clock driven by GSAP ticker
      prevent: (node) => {
        return (
          node.hasAttribute("data-lenis-prevent") ||
          Boolean(node.closest("[data-lenis-prevent]"))
        );
      },
    });

    lenisRef.current = lenis;
    (window as unknown as { __lenis?: Lenis }).__lenis = lenis;

    // Coordinated scroll clock: update ScrollTrigger whenever Lenis scrolls
    const onLenisScroll = () => {
      ScrollTrigger.update();
    };
    lenis.on("scroll", onLenisScroll);

    // Drive Lenis RAF inside GSAP ticker for ONE unified animation-frame loop
    const onTicker = (time: number) => {
      lenis.raf(time * 1000);
    };
    gsap.ticker.add(onTicker);
    gsap.ticker.lagSmoothing(0);

    // Intercept in-page anchor links for seamless, synchronized scrolling
    const handleAnchorClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest("a");
      if (!target) return;
      const href = target.getAttribute("href");
      if (!href) return;

      // Check for in-page anchors like "#categories" or "/#categories"
      if (href.startsWith("#") || (href.startsWith("/#") && window.location.pathname === "/")) {
        const hash = href.startsWith("/#") ? href.slice(1) : href;
        if (hash.length > 1) {
          const el = document.querySelector(hash);
          if (el) {
            e.preventDefault();
            lenis.scrollTo(el as HTMLElement, {
              offset: 0,
              duration: 0.9,
            });
            window.history.pushState(null, "", hash);
          }
        }
      }
    };

    document.addEventListener("click", handleAnchorClick, { capture: true });

    return () => {
      document.removeEventListener("click", handleAnchorClick, { capture: true });
      gsap.ticker.remove(onTicker);
      lenis.off("scroll", onLenisScroll);
      lenis.destroy();
      lenisRef.current = null;
      delete (window as unknown as { __lenis?: Lenis }).__lenis;
    };
  }, []);

  return null;
}

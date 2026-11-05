"use client";

import { useLayoutEffect, useRef } from "react";
import Link from "next/link";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { AboutTimeline } from "./about-timeline";
import styles from "./about.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

const values = [
  { title: "Quality", body: "Thoughtful appliances for the moments that make a home run beautifully." },
  { title: "Care", body: "A warmer, more personal way to choose the essentials your family relies on." },
  { title: "Trust", body: "Clear guidance and lasting comfort, shared with homes across Pakistan." },
];

export function AboutExperience() {
  const containerRef = useRef<HTMLElement>(null);
  const heroCopyRef = useRef<HTMLDivElement>(null);
  const storyRef = useRef<HTMLElement>(null);
  const storyDividerRef = useRef<HTMLDivElement>(null);
  const valuesRef = useRef<HTMLElement>(null);
  const valuesDividerRef = useRef<HTMLDivElement>(null);
  const valueListDividerRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef<HTMLElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reducedMotion) return;

    const ctx = gsap.context(() => {
      // 1. Hero section choreographed entrance on load
      if (heroCopyRef.current) {
        const eyebrow = heroCopyRef.current.querySelector(`.${styles.eyebrow}`);
        const title = heroCopyRef.current.querySelector(`.${styles.title}`);
        const intro = heroCopyRef.current.querySelector(`.${styles.intro}`);

        // Apply the reveal state before the browser paints. This keeps the
        // server-rendered page readable until hydration, but prevents a
        // visible section from being reset to opacity 0 when its trigger fires.
        gsap.set(eyebrow, { opacity: 0, y: 16 });
        gsap.set(title, { opacity: 0, y: 26, clipPath: "inset(0 0 100% 0)" });
        gsap.set(intro, { opacity: 0, y: 22 });
        const heroTl = gsap.timeline();

        if (eyebrow) {
          heroTl.fromTo(
            eyebrow,
            { opacity: 0, y: 16 },
            { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
            0.05
          );
        }

        if (title) {
          heroTl.fromTo(
            title,
            { opacity: 0, y: 26, clipPath: "inset(0 0 100% 0)" },
            { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)", duration: 0.68, ease: "power3.out" },
            0.15
          );
        }

        if (intro) {
          heroTl.fromTo(
            intro,
            { opacity: 0, y: 22 },
            { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
            0.32
          );
        }
      }

      // 2. Story section coordinated entrance: divider -> label -> heading -> paragraphs
      if (storyRef.current) {
        const storyDivider = storyDividerRef.current;
        const storyLabel = storyRef.current.querySelector(`.${styles.sectionLabel}`);
        const storyHeading = storyRef.current.querySelector("#story-heading");
        const paragraphs = storyRef.current.querySelectorAll(`.${styles.storyBody} p`);

        gsap.set(storyDivider, { scaleX: 0 });
        gsap.set(storyLabel, { opacity: 0, y: 16 });
        gsap.set(storyHeading, { opacity: 0, y: 26, clipPath: "inset(0 0 100% 0)" });
        gsap.set(paragraphs, { opacity: 0, y: 22, x: 12 });

        ScrollTrigger.create({
          trigger: storyRef.current,
          start: "top 78%",
          once: true,
          onEnter: () => {
            const storyTl = gsap.timeline();

            // First: Section divider draws smoothly from left to right
            if (storyDivider) {
              storyTl.fromTo(
                storyDivider,
                { scaleX: 0 },
                { scaleX: 1, duration: 0.65, ease: "power2.out" },
                0
              );
            }

            // Second: Small section label appears
            if (storyLabel) {
              storyTl.fromTo(
                storyLabel,
                { opacity: 0, y: 16 },
                { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
                0.14
              );
            }

            // Third: Main heading rises through a smooth masked reveal
            if (storyHeading) {
              storyTl.fromTo(
                storyHeading,
                { opacity: 0, y: 26, clipPath: "inset(0 0 100% 0)" },
                { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)", duration: 0.65, ease: "power3.out" },
                0.22
              );
            }

            // Fourth: Supporting paragraphs enter in sequence with slight upward and horizontal offset
            if (paragraphs.length > 0) {
              storyTl.fromTo(
                paragraphs,
                { opacity: 0, y: 22, x: 12 },
                { opacity: 1, y: 0, x: 0, duration: 0.6, ease: "power3.out", stagger: 0.12 },
                0.35
              );
            }
          },
        });
      }

      // 3. Quality, Care & Trust section choreography: divider -> intro -> list divider -> sequential values
      if (valuesRef.current) {
        const valuesDivider = valuesDividerRef.current;
        const valueListDivider = valueListDividerRef.current;
        const valuesHeader = valuesRef.current.querySelector(`.${styles.valuesIntro}`);
        const valueCards = valuesRef.current.querySelectorAll(`.${styles.value}`);

        gsap.set(valuesDivider, { scaleX: 0 });
        gsap.set(valueListDivider, { scaleX: 0 });
        gsap.set(valuesHeader, { opacity: 0, y: 24, clipPath: "inset(0 0 100% 0)" });
        gsap.set(valueCards, { opacity: 0, y: 26, x: 8 });

        ScrollTrigger.create({
          trigger: valuesRef.current,
          start: "top 76%",
          once: true,
          onEnter: () => {
            const valuesTl = gsap.timeline();

            // Top section divider draws in
            if (valuesDivider) {
              valuesTl.fromTo(
                valuesDivider,
                { scaleX: 0 },
                { scaleX: 1, duration: 0.65, ease: "power2.out" },
                0
              );
            }

            // Section heading reveals
            if (valuesHeader) {
              valuesTl.fromTo(
                valuesHeader,
                { opacity: 0, y: 24, clipPath: "inset(0 0 100% 0)" },
                { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)", duration: 0.62, ease: "power3.out" },
                0.15
              );
            }

            // Separator above value cards draws in
            if (valueListDivider) {
              valuesTl.fromTo(
                valueListDivider,
                { scaleX: 0 },
                { scaleX: 1, duration: 0.65, ease: "power2.out" },
                0.28
              );
            }

            // Values cascade in sequence: 01 Quality -> 02 Care -> 03 Trust
            valuesTl.fromTo(
              valueCards,
              { opacity: 0, y: 26, x: 8 },
              {
                opacity: 1,
                y: 0,
                x: 0,
                duration: 0.65,
                ease: "power3.out",
                stagger: 0.16,
              },
              0.38
            );
          },
        });
      }

      // 4. Closing section calm and meaningful finish
      if (closingRef.current) {
        const closingLabel = closingRef.current.querySelector(`.${styles.sectionLabel}`);
        const closingHeading = closingRef.current.querySelector("#closing-heading");
        const closingP = closingRef.current.querySelector("p:not(." + styles.sectionLabel + ")");
        const closingLink = closingRef.current.querySelector(`.${styles.productsLink}`);

        gsap.set(closingLabel, { opacity: 0, y: 16 });
        gsap.set(closingHeading, { opacity: 0, y: 24, clipPath: "inset(0 0 100% 0)" });
        gsap.set(closingP, { opacity: 0, y: 20 });
        gsap.set(closingLink, { opacity: 0, y: 18 });

        ScrollTrigger.create({
          trigger: closingRef.current,
          start: "top 78%",
          once: true,
          onEnter: () => {
            const closingTl = gsap.timeline();

            if (closingLabel) {
              closingTl.fromTo(
                closingLabel,
                { opacity: 0, y: 16 },
                { opacity: 1, y: 0, duration: 0.5, ease: "power3.out" },
                0
              );
            }

            if (closingHeading) {
              closingTl.fromTo(
                closingHeading,
                { opacity: 0, y: 24, clipPath: "inset(0 0 100% 0)" },
                { opacity: 1, y: 0, clipPath: "inset(0 0 0% 0)", duration: 0.65, ease: "power3.out" },
                0.12
              );
            }

            if (closingP) {
              closingTl.fromTo(
                closingP,
                { opacity: 0, y: 20 },
                { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" },
                0.24
              );
            }

            if (closingLink) {
              closingTl.fromTo(
                closingLink,
                { opacity: 0, y: 18 },
                { opacity: 1, y: 0, duration: 0.55, ease: "power3.out" },
                0.36
              );
            }
          },
        });
      }
    }, container);

    // Recalculate trigger positions after the hydrated layout and font metrics
    // settle. This refreshes positions only; it never rebuilds or replays a
    // completed `once` trigger.
    const refreshFrame = window.requestAnimationFrame(() => ScrollTrigger.refresh());

    return () => {
      window.cancelAnimationFrame(refreshFrame);
      ctx.revert();
    };
  }, []);

  return (
    <main id="main-content" ref={containerRef}>
      <section className={styles.hero} aria-labelledby="about-heading">
        <div className={styles.heroCopy} ref={heroCopyRef}>
          <p className={styles.eyebrow}>Our story · Since 1992</p>
          <h1 id="about-heading" className={styles.title}>A story of care, comfort <em>&amp; home.</em></h1>
          <p className={styles.intro}>Since 1992, NS Home Appliances has been part of the everyday rhythm of Pakistani homes—bringing considered comfort to kitchens, laundry rooms, and the spaces families share.</p>
        </div>
        <AboutTimeline />
      </section>

      <div className={styles.divider} ref={storyDividerRef} aria-hidden="true" />

      <section className={styles.story} aria-labelledby="story-heading" ref={storyRef}>
        <p className={styles.sectionLabel}>Built with home in mind</p>
        <div className={styles.storyGrid}>
          <h2 id="story-heading">Made for the little things that mean everything.</h2>
          <div className={styles.storyBody}>
            <p>We believe a home is built in the everyday: a meal made with care, a cooler evening, a freshly washed favorite shirt. That is why we focus on quality you can feel and choices that fit real family life.</p>
            <p>Rooted in Pakistan, our story continues with the same simple idea: make home feel easier, warmer, and more yours.</p>
          </div>
        </div>
      </section>

      <div className={styles.divider} ref={valuesDividerRef} aria-hidden="true" />

      <section className={styles.values} aria-labelledby="values-heading" ref={valuesRef}>
        <div className={styles.valuesIntro}>
          <p className={styles.sectionLabel}>What stays with us</p>
          <h2 id="values-heading">Care in every detail.</h2>
        </div>
        <div className={styles.valueListDivider} ref={valueListDividerRef} aria-hidden="true" />
        <div className={styles.valueList}>
          {values.map((value) => (
            <article className={styles.value} key={value.title}>
              <h3>{value.title}</h3>
              <p>{value.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className={styles.closing} aria-labelledby="closing-heading" ref={closingRef}>
        <p className={styles.sectionLabel}>For the homes we love</p>
        <h2 id="closing-heading">Here for the next chapter of home.</h2>
        <p>Explore appliances chosen for the comfort, care, and life happening inside yours.</p>
        <Link className={styles.productsLink} href="/products">Explore our appliances <span aria-hidden="true">→</span></Link>
      </section>
    </main>
  );
}

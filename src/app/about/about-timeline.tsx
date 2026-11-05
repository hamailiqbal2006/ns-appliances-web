"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import styles from "./about.module.css";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

export function AboutTimeline() {
  const frameRef = useRef<HTMLDivElement>(null);
  const pathRef = useRef<SVGPathElement>(null);
  const arrowRef = useRef<SVGPathElement>(null);
  const todayLabelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const frame = frameRef.current;
    const path = pathRef.current;
    const arrow = arrowRef.current;
    const todayLabel = todayLabelRef.current;
    if (!frame || !path || !arrow) return;

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const curveLength = path.getTotalLength();
    const arrowLength = arrow.getTotalLength();

    // Set initial stroke dash properties
    gsap.set(path, {
      strokeDasharray: curveLength,
      strokeDashoffset: curveLength,
    });
    gsap.set(arrow, {
      strokeDasharray: arrowLength,
      strokeDashoffset: arrowLength,
      opacity: 0,
    });

    if (reducedMotion) {
      gsap.set(path, { strokeDashoffset: 0 });
      gsap.set(arrow, { strokeDashoffset: 0, opacity: 1 });
      if (todayLabel) gsap.set(todayLabel, { color: "#111618" });
      return;
    }

    const ctx = gsap.context(() => {
      const mm = gsap.matchMedia();

      const setupScrub = (startPoint: string, endPoint: string) => {
        const tl = gsap.timeline({
          scrollTrigger: {
            trigger: frame,
            start: startPoint,
            end: endPoint,
            scrub: 0.24,
            invalidateOnRefresh: true,
          },
        });

        // 1. Curve draws smoothly from 1992 across the entire timeline journey (0% -> 88%)
        tl.fromTo(
          path,
          { strokeDashoffset: curveLength },
          { strokeDashoffset: 0, ease: "none", duration: 0.88 },
          0
        );

        // 2. Bold arrowhead forms, fades in, and seamlessly attaches as the curve approaches TODAY (74% -> 94%)
        tl.fromTo(
          arrow,
          { strokeDashoffset: arrowLength, opacity: 0 },
          { strokeDashoffset: 0, opacity: 1, ease: "power1.out", duration: 0.2 },
          0.74
        );

        // 3. TODAY label becomes visually emphasized as the drawing completes (88% -> 100%)
        if (todayLabel) {
          tl.fromTo(
            todayLabel,
            { color: "#717675" },
            { color: "#111618", ease: "power1.out", duration: 0.12 },
            0.88
          );
        }
      };

      // Desktop: calibrated for 320px of smooth, moderate scroll travel
      mm.add("(min-width: 801px)", () => {
        setupScrub("top 43.5%", "+=320");
      });

      // Mobile: calibrated for 260px of comfortable touch scroll travel
      mm.add("(max-width: 800px)", () => {
        setupScrub("top 60%", "+=260");
      });
    }, frame);

    return () => {
      ctx.revert();
    };
  }, []);

  return (
    <div className={styles.timeline} ref={frameRef}>
      <div className={styles.timelineLabel}>
        <span>1992</span>
        <span ref={todayLabelRef} className={styles.todayLabel}>Today</span>
      </div>
      <svg
        className={styles.timelineGraphic}
        viewBox="0 0 720 148"
        fill="none"
        role="img"
        aria-label="A line tracing NS Home Appliances' journey from 1992 to today"
        shapeRendering="geometricPrecision"
      >
        <path
          ref={pathRef}
          d="M18 108C98 108 122 42 210 68C297 94 331 136 431 80C522 29 600 34 682 58"
          shapeRendering="geometricPrecision"
        />
        <path
          ref={arrowRef}
          d="M656 40L684 58L656 76"
          shapeRendering="geometricPrecision"
        />
      </svg>
      <p className={styles.timelineCaption}>A little more comfort, with every year.</p>
    </div>
  );
}

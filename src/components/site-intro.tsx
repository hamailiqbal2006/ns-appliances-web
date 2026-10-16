"use client";

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import styles from "./site-intro.module.css";

const SESSION_KEY = "ns-home-intro-seen";
const WORDS = ["NS Home Appliances", "Search", "Products", "Categories", "Visit"];
const EASE = [0.22, 1, 0.36, 1] as const;

interface SiteIntroProps {
  onNavbarReveal: () => void;
}

/** A homepage-only, client-side opening overlay. The storefront stays mounted underneath. */
export function SiteIntro({ onNavbarReveal }: SiteIntroProps) {
  const reduceMotion = useReducedMotion();
  const isDevelopment = process.env.NODE_ENV === "development";
  // Local previews intentionally use the complete sequence on every refresh,
  // regardless of an OS or browser reduced-motion preference.
  const shouldReduceMotion = !isDevelopment && reduceMotion;
  const [open, setOpen] = useState(true);
  const [wordIndex, setWordIndex] = useState(0);
  const [arrowVisible, setArrowVisible] = useState(false);
  const [arrowRising, setArrowRising] = useState(false);

  useEffect(() => {
    const isProduction = process.env.NODE_ENV === "production";
    const hasSeenIntro = isProduction && sessionStorage.getItem(SESSION_KEY) === "true";

    const timerIds: number[] = [];
    const schedule = (callback: () => void, delay: number) => {
      timerIds.push(window.setTimeout(callback, delay));
    };

    if (hasSeenIntro) {
      onNavbarReveal();
      schedule(() => setOpen(false), 0);
      return () => timerIds.forEach((timer) => window.clearTimeout(timer));
    }

    if (isProduction) sessionStorage.setItem(SESSION_KEY, "true");

    if (shouldReduceMotion) {
      schedule(() => setArrowVisible(true), 160);
      schedule(() => {
        setArrowRising(true);
        onNavbarReveal();
      }, 280);
      schedule(() => setOpen(false), 640);
    } else {
      [560, 1_080, 1_600, 2_120].forEach((delay, index) =>
        schedule(() => setWordIndex(index + 1), delay)
      );
      schedule(() => setArrowVisible(true), 2_510);
      schedule(() => {
        setArrowRising(true);
        onNavbarReveal();
      }, 2_760);
      schedule(() => setOpen(false), 3_220);
    }

    return () => timerIds.forEach((timer) => window.clearTimeout(timer));
  }, [isDevelopment, onNavbarReveal, shouldReduceMotion]);

  useEffect(() => {
    if (!open) return;

    const html = document.documentElement;
    const body = document.body;
    const previousHtmlOverflow = html.style.overflow;
    const previousBodyOverflow = body.style.overflow;
    const previousBodyOverscroll = body.style.overscrollBehavior;

    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";

    return () => {
      html.style.overflow = previousHtmlOverflow;
      body.style.overflow = previousBodyOverflow;
      body.style.overscrollBehavior = previousBodyOverscroll;
    };
  }, [open]);

  if (!open) return null;

  return (
    <motion.section
      className={styles.intro}
      aria-label="Opening NS Home Appliances"
      role="status"
      animate={arrowRising ? { opacity: 0, y: -16 } : { opacity: 1, y: 0 }}
      transition={{ duration: shouldReduceMotion ? 0.18 : 0.46, delay: arrowRising ? 0.18 : 0 }}
    >
      <div className={styles.stage} aria-hidden="true">
        <AnimatePresence initial={false} mode="sync">
          {!arrowRising && (
            <motion.p
              key={WORDS[wordIndex]}
              className={`${styles.word}${wordIndex === 0 ? ` ${styles.brand}` : ""}`}
              initial={{ opacity: 0, y: "0.76em", clipPath: "inset(100% 0 0 0)" }}
              animate={{ opacity: 1, y: 0, clipPath: "inset(0 0 0 0)" }}
              exit={{ opacity: 0, y: "-0.72em", clipPath: "inset(0 0 100% 0)" }}
              transition={{ duration: shouldReduceMotion ? 0.001 : 0.34, ease: EASE }}
            >
              {WORDS[wordIndex]}
            </motion.p>
          )}
        </AnimatePresence>
        <motion.span
          className={styles.arrow}
          aria-hidden="true"
          initial={false}
          animate={
            arrowRising
              ? { opacity: 1, y: "calc(-50svh + 72px)", scale: 0.76 }
              : { opacity: arrowVisible ? 1 : 0, y: arrowVisible ? 0 : 12, scale: 1 }
          }
          transition={{ duration: shouldReduceMotion ? 0.12 : 0.56, ease: EASE }}
        >
          ↑
        </motion.span>
      </div>
      <span className="sr-only">Opening NS Home Appliances.</span>
    </motion.section>
  );
}

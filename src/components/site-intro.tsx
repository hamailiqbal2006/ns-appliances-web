"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import styles from "./site-intro.module.css";

const SESSION_KEY = "ns-home-intro-seen";
const WORDS = ["NS Home Appliances", "Search", "Products", "Categories", "Visit"];
const WORD_CUES = [0, 620, 1120, 1620, 2120];
const EASE = [0.22, 1, 0.36, 1] as const;

type IntroPhase = "sequence" | "orb" | "reveal";

/** A homepage-only overlay. Removing this component leaves the storefront untouched. */
export function SiteIntro() {
  const [open, setOpen] = useState(true);
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<IntroPhase>("sequence");
  const timeouts = useRef<number[]>([]);

  useLayoutEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) {
      setOpen(false);
      return;
    }

    sessionStorage.setItem(SESSION_KEY, "true");
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const schedule = (callback: () => void, delay: number) => {
      timeouts.current.push(window.setTimeout(callback, delay));
    };

    if (reduceMotion) {
      schedule(() => setPhase("orb"), 280);
      schedule(() => setPhase("reveal"), 470);
      schedule(() => setOpen(false), 1_300);
    } else {
      WORD_CUES.slice(1).forEach((cue, index) => schedule(() => setWordIndex(index + 1), cue));
      schedule(() => setPhase("orb"), 2_650);
      schedule(() => setPhase("reveal"), 2_880);
      schedule(() => setOpen(false), 3_820);
    }

    return () => timeouts.current.forEach((timeout) => window.clearTimeout(timeout));
  }, []);

  useLayoutEffect(() => {
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

  const isOrb = phase !== "sequence";
  const isRevealing = phase === "reveal";

  return (
    <div className={`${styles.intro}${isRevealing ? ` ${styles.revealing}` : ""}`} aria-label="Opening NS Home Appliances" role="status">
      <div className={styles.noise} aria-hidden="true" />
      <div className={styles.frame} aria-hidden="true" />
      <div className={styles.content} aria-hidden="true">
        <AnimatePresence initial={false} mode="sync">
          {!isOrb && (
            <motion.div
              key={WORDS[wordIndex]}
              className={`${styles.word}${wordIndex === 0 ? ` ${styles.brand}` : ""}`}
              initial={{ opacity: 0, y: "0.72em", filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: "-0.66em", filter: "blur(1px)" }}
              transition={{ duration: 0.38, ease: EASE }}
            >
              {WORDS[wordIndex]}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div className={styles.orb} initial={false} animate={isOrb ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.28 }} transition={{ duration: 0.26, ease: EASE }} />
      </div>
      <div className={styles.meta} aria-hidden="true">
        <span className={styles.counter}>{String(wordIndex + 1).padStart(2, "0")} / 05</span>
        <motion.span className={styles.rule} animate={{ scaleX: isOrb ? 1 : (wordIndex + 1) / WORDS.length }} transition={{ duration: 0.36, ease: EASE }} />
      </div>
      <span className="sr-only">Opening NS Home Appliances.</span>
    </div>
  );
}

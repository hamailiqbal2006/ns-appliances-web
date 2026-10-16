"use client";

import { AnimatePresence, motion } from "motion/react";
import { useLayoutEffect, useRef, useState } from "react";
import "./site-intro.module.css";

const SESSION_KEY = "ns-home-intro-seen";
const WORDS = ["NS Home Appliances", "Search", "Products", "Categories", "Visit"];
const WORD_CUES = [0, 620, 1120, 1620, 2120];
const EASE = [0.22, 1, 0.36, 1] as const;
const REPLAY_ON_RELOAD = process.env.NODE_ENV === "development";

type IntroPhase = "sequence" | "orb" | "reveal";

/** A homepage-only overlay. Removing this component leaves the storefront untouched. */
export function SiteIntro() {
  const [open, setOpen] = useState(true);
  const [wordIndex, setWordIndex] = useState(0);
  const [phase, setPhase] = useState<IntroPhase>("sequence");
  const timeouts = useRef<number[]>([]);

  useLayoutEffect(() => {
    if (!REPLAY_ON_RELOAD) {
      if (sessionStorage.getItem(SESSION_KEY)) {
        const closeTimeout = window.setTimeout(() => setOpen(false));
        return () => window.clearTimeout(closeTimeout);
      }

      sessionStorage.setItem(SESSION_KEY, "true");
    }

    const scheduledTimeouts = timeouts.current;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const schedule = (callback: () => void, delay: number) => {
      scheduledTimeouts.push(window.setTimeout(callback, delay));
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

    return () => scheduledTimeouts.forEach((timeout) => window.clearTimeout(timeout));
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
    <div className={`site-intro${isRevealing ? " is-revealing" : ""}`} aria-label="Opening NS Home Appliances" role="status">
      <div className="site-intro-noise" aria-hidden="true" />
      <div className="site-intro-frame" aria-hidden="true" />
      <div className="site-intro-content" aria-hidden="true">
        <AnimatePresence initial={false} mode="sync">
          {!isOrb && (
            <motion.div
              key={WORDS[wordIndex]}
              className={`site-intro-word${wordIndex === 0 ? " is-brand" : ""}`}
              initial={{ opacity: 0, y: "0.72em", filter: "blur(2px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: "-0.66em", filter: "blur(1px)" }}
              transition={{ duration: 0.38, ease: EASE }}
            >
              {WORDS[wordIndex]}
            </motion.div>
          )}
        </AnimatePresence>
        <motion.div className="site-intro-orb" initial={false} animate={isOrb ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.28 }} transition={{ duration: 0.26, ease: EASE }} />
      </div>
      <div className="site-intro-meta" aria-hidden="true">
        <span className="site-intro-counter">{String(wordIndex + 1).padStart(2, "0")} / 05</span>
        <motion.span className="site-intro-rule" animate={{ scaleX: isOrb ? 1 : (wordIndex + 1) / WORDS.length }} transition={{ duration: 0.36, ease: EASE }} />
      </div>
      <span className="sr-only">Opening NS Home Appliances.</span>
    </div>
  );
}

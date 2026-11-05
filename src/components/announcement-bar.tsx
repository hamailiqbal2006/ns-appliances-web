"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type {
  AnnouncementMessage,
  AnnouncementSeparator,
  AnnouncementSpeed,
  AnnouncementTheme,
} from "@/lib/announcement-bar";
import styles from "./announcement-bar.module.css";

export type AnnouncementBarProps = {
  messages: Array<Pick<AnnouncementMessage, "id" | "message"> & { isActive?: boolean }>;
  enabled?: boolean;
  theme?: AnnouncementTheme;
  separator?: AnnouncementSeparator;
  speed?: AnnouncementSpeed;
  previewMode?: boolean;
  className?: string;
};

export function SeparatorGlyph({ separator }: { separator: AnnouncementSeparator }) {
  switch (separator) {
    case "diamond":
      return (
        <svg
          className={styles.glyphSvg}
          viewBox="0 0 8 8"
          width="5.5"
          height="5.5"
          aria-hidden="true"
          focusable="false"
        >
          <path d="M4 0.6L7.4 4L4 7.4L0.6 4Z" fill="currentColor" />
        </svg>
      );
    case "star":
      return (
        <svg
          className={styles.glyphSvg}
          viewBox="0 0 10 10"
          width="7"
          height="7"
          aria-hidden="true"
          focusable="false"
        >
          <path
            d="M5 0.5C5 2.8 3.3 4.5 0.5 5C3.3 5.5 5 7.2 5 9.5C5 7.2 6.7 5.5 9.5 5C6.7 4.5 5 2.8 5 0.5Z"
            fill="currentColor"
          />
        </svg>
      );
    case "slash":
      return (
        <svg
          className={styles.glyphSvg}
          viewBox="0 0 6 12"
          width="5"
          height="9"
          aria-hidden="true"
          focusable="false"
        >
          <line x1="4.5" y1="1.5" x2="1.5" y2="10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "dot":
    default:
      return (
        <svg
          className={styles.glyphSvg}
          viewBox="0 0 6 6"
          width="4.5"
          height="4.5"
          aria-hidden="true"
          focusable="false"
        >
          <circle cx="3" cy="3" r="2.2" fill="currentColor" />
        </svg>
      );
  }
}

// Visual speeds in true CSS pixels per second
const SPEED_PPS: Record<AnnouncementSpeed, number> = {
  slow: 35,
  normal: 50,
  fast: 70,
};

// Map each theme to its scoped CSS class
const THEME_CLASSES: Record<AnnouncementTheme, string> = {
  "charcoal-graphite": styles.themeCharcoal,
  "deep-navy-teal": styles.themeNavy,
  "soft-black-blue": styles.themeObsidian,
  "dark-olive-charcoal": styles.themeOlive,
  "warm-beige-stone": styles.themeBeige,
  "ruby-red": styles.themeRubyRed,
  "crimson-sunset": styles.themeCrimsonSunset,
  "golden-yellow": styles.themeGoldenYellow,
  "sunset-orange": styles.themeSunsetOrange,
  "rose-pink": styles.themeRosePink,
  "royal-purple": styles.themeRoyalPurple,
  "electric-blue": styles.themeElectricBlue,
  "ocean-cyan": styles.themeOceanCyan,
  "emerald-green": styles.themeEmeraldGreen,
  "lime-energy": styles.themeLimeEnergy,
  "berry-fusion": styles.themeBerryFusion,
  "festival-gradient": styles.themeFestivalGradient,
};

function AnnouncementBarViewComponent({
  messages,
  enabled = true,
  theme = "charcoal-graphite",
  separator = "dot",
  speed = "normal",
  previewMode = false,
  className = "",
}: AnnouncementBarProps) {
  const containerRef = useRef<HTMLElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);

  // Filter valid active items
  const activeItems = useMemo(() => {
    return messages.filter((item) => (item.isActive ?? true) && item.message.trim().length > 0);
  }, [messages]);

  // Initial SSR / safe initial repetition
  const [repetitions, setRepetitions] = useState<number>(() => {
    const totalChars = activeItems.reduce((acc, curr) => acc + curr.message.trim().length, 0);
    return Math.max(2, Math.min(10, Math.ceil(240 / Math.max(totalChars, 1))));
  });

  const [animationDuration, setAnimationDuration] = useState<number>(30);
  const [isMeasured, setIsMeasured] = useState(false);

  // Measure rendered single sequence and compute exact repetitions & velocity-based duration
  const measureAndTune = useCallback(() => {
    if (!measureRef.current || !containerRef.current || !activeItems.length) return;

    const singleWidth = measureRef.current.getBoundingClientRect().width;
    const containerWidth = containerRef.current.getBoundingClientRect().width || 1440;

    if (singleWidth <= 0) return;

    // Buffer to ensure Group 1 completely clears the visible area with continuous overflow
    const buffer = Math.max(300, containerWidth * 0.35);
    const targetWidth = containerWidth + buffer;
    const calculatedReps = Math.max(2, Math.ceil(targetWidth / singleWidth));

    const measuredGroupWidth = singleWidth * calculatedReps;
    const pps = SPEED_PPS[speed] ?? 50;
    const calculatedDuration = Math.max(8, Number((measuredGroupWidth / pps).toFixed(2)));

    setRepetitions((prev) => (prev !== calculatedReps ? calculatedReps : prev));
    setAnimationDuration((prev) => (Math.abs(prev - calculatedDuration) > 0.3 ? calculatedDuration : prev));
    setIsMeasured(true);
  }, [activeItems.length, speed]);

  // Measure after fonts are loaded and observe viewport resize
  useEffect(() => {
    let isCancelled = false;

    const runMeasure = async () => {
      if (typeof document !== "undefined" && document.fonts?.ready) {
        try {
          await document.fonts.ready;
        } catch {
          // ignore font loading error
        }
      }
      if (!isCancelled) {
        measureAndTune();
      }
    };

    runMeasure();

    const container = containerRef.current;
    if (!container || typeof ResizeObserver === "undefined") return;

    let lastWidth = container.getBoundingClientRect().width;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        // Only trigger update if viewport width changes by more than 16px to prevent thrashing
        if (Math.abs(newWidth - lastWidth) > 16) {
          lastWidth = newWidth;
          measureAndTune();
        }
      }
    });

    ro.observe(container);

    return () => {
      isCancelled = true;
      ro.disconnect();
    };
  }, [measureAndTune]);

  // Build the repeated sequence for one group
  const groupItems = useMemo(() => {
    if (!activeItems.length || repetitions === 0) return [];
    const list: Array<{ key: string; message: string }> = [];
    for (let r = 0; r < repetitions; r++) {
      for (let i = 0; i < activeItems.length; i++) {
        list.push({
          key: `${r}-${activeItems[i].id || i}`,
          message: activeItems[i].message.trim(),
        });
      }
    }
    return list;
  }, [activeItems, repetitions]);

  if (!enabled || !activeItems.length) {
    if (previewMode) {
      return (
        <div className={`${styles.bar} ${styles.themeCharcoal} ${styles.previewEmpty}`}>
          <span className={styles.emptyNote}>
            {!enabled ? "Announcement bar is currently disabled." : "No active announcement messages."}
          </span>
        </div>
      );
    }
    return null;
  }

  const themeClass = THEME_CLASSES[theme] || styles.themeCharcoal;

  const combinedClass = [
    styles.bar,
    themeClass,
    previewMode ? styles.previewContainer : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const screenReaderText = activeItems.map((item) => item.message.trim()).join(". ");

  return (
    <aside
      ref={containerRef}
      className={combinedClass}
      tabIndex={0}
      aria-label="Store announcements"
      role="region"
    >
      <span className="sr-only">Store announcements: {screenReaderText}</span>

      {/* Hidden single sequence template for pixel-perfect content measurement */}
      <div ref={measureRef} className={styles.measureContainer} aria-hidden="true">
        {activeItems.map((item, index) => (
          <span key={`meas-${item.id || index}`} className={styles.itemUnit}>
            <span className={styles.itemText}>{item.message.trim()}</span>
            <span className={styles.separator}>
              <SeparatorGlyph separator={separator} />
            </span>
          </span>
        ))}
      </div>

      {/* Stationary hardware-friendly edge fade overlays (no expensive mask-image) */}
      <span className={styles.fadeLeft} aria-hidden="true" />
      <span className={styles.fadeRight} aria-hidden="true" />

      {/* Reduced-motion static view */}
      <div className={styles.reducedMotionTrack} aria-hidden="true">
        {activeItems.map((item, index) => (
          <span key={`reduced-${item.id || index}`} className={styles.reducedItem}>
            {index > 0 && (
              <span className={styles.separator} aria-hidden="true">
                <SeparatorGlyph separator={separator} />
              </span>
            )}
            <span className={styles.itemText}>{item.message.trim()}</span>
          </span>
        ))}
      </div>

      {/* Infinite seamless moving marquee track: Group 1 followed immediately by identical Group 2 */}
      <div
        className={styles.marqueeTrack}
        style={{
          animationDuration: `${animationDuration}s`,
          opacity: isMeasured ? 1 : 0.9,
        }}
        aria-hidden="true"
      >
        <div className={styles.marqueeGroup}>
          {groupItems.map((item) => (
            <span key={`g1-${item.key}`} className={styles.itemUnit}>
              <span className={styles.itemText}>{item.message}</span>
              <span className={styles.separator} aria-hidden="true">
                <SeparatorGlyph separator={separator} />
              </span>
            </span>
          ))}
        </div>
        <div className={styles.marqueeGroup}>
          {groupItems.map((item) => (
            <span key={`g2-${item.key}`} className={styles.itemUnit}>
              <span className={styles.itemText}>{item.message}</span>
              <span className={styles.separator} aria-hidden="true">
                <SeparatorGlyph separator={separator} />
              </span>
            </span>
          ))}
        </div>
      </div>
    </aside>
  );
}

// React.memo prevents parent re-renders (such as the 5.5s hero banner rotation) from touching the marquee
export const AnnouncementBarView = React.memo(AnnouncementBarViewComponent);

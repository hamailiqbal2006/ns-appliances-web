/* eslint-disable @next/next/no-img-element -- Exact mathematical panorama calculations require direct DOM image reference for natural dimensions, rendered geometry, and GSAP transform animation */
"use client";

import { useEffect, useRef, useState } from "react";
import gsap from "gsap";

interface StorefrontPanoramaProps {
  src: string;
  alt?: string;
}

interface PanGeometry {
  renderedWidth: number;
  renderedHeight: number;
  y: number;
  overflow: number;
}

/**
 * Calculates exact coverage scale and horizontal overflow for the storefront photo.
 * Ensures the image covers the container without distortion or artificial stretching.
 */
function calculatePan(
  imageWidth: number,
  imageHeight: number,
  containerWidth: number,
  containerHeight: number
): PanGeometry {
  if (imageWidth <= 0 || imageHeight <= 0 || containerWidth <= 0 || containerHeight <= 0) {
    return { renderedWidth: 0, renderedHeight: 0, y: 0, overflow: 0 };
  }

  const scale = Math.max(
    containerWidth / imageWidth,
    containerHeight / imageHeight
  );

  const renderedWidth = imageWidth * scale;
  const renderedHeight = imageHeight * scale;

  return {
    renderedWidth,
    renderedHeight,
    y: (containerHeight - renderedHeight) / 2,
    overflow: Math.max(0, renderedWidth - containerWidth),
  };
}

export function StorefrontPanorama({
  src,
  alt = "NS Home Appliances Storefront Exterior",
}: StorefrontPanoramaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
  const timelineRef = useRef<gsap.core.Timeline | null>(null);
  const isVisibleRef = useRef(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    let mounted = true;
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return;

    // Recalculates dimensions and recreates or updates the GSAP pan timeline
    const recalculateAndAnimate = () => {
      if (!mounted || !img || !container) return;

      const naturalWidth = img.naturalWidth;
      const naturalHeight = img.naturalHeight;
      if (!naturalWidth || !naturalHeight) return;

      const rect = container.getBoundingClientRect();
      const containerWidth = rect.width;
      const containerHeight = rect.height;
      if (!containerWidth || !containerHeight) return;

      const { renderedWidth, renderedHeight, y, overflow } = calculatePan(
        naturalWidth,
        naturalHeight,
        containerWidth,
        containerHeight
      );

      // Apply rendered dimensions and vertical center offset
      img.style.width = `${renderedWidth}px`;
      img.style.height = `${renderedHeight}px`;
      img.style.top = `${y}px`;
      img.style.left = "0px";

      // Check reduced motion
      const prefersReducedMotion =
        typeof window !== "undefined" &&
        window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      // Preserve existing normalized progress across resizes if timeline existed
      let prevProgress = 0;
      if (timelineRef.current) {
        prevProgress = timelineRef.current.progress();
        timelineRef.current.kill();
        timelineRef.current = null;
      }

      if (prefersReducedMotion || overflow < 20) {
        // Disable continuous pan and center image horizontally
        gsap.set(img, {
          x: -overflow / 2,
          force3D: true,
        });
        Object.assign(img, {
          __panoramaTimeline: null,
          __panoramaOverflow: overflow,
          __isReducedMotion: prefersReducedMotion,
        });
        return;
      }

      // Exact horizontal pan: from 0 (left) to -overflow (right) with sine.inOut and 1.5s pause at each edge
      const tl = gsap.timeline({
        paused: true,
        repeat: -1,
        yoyo: true,
        repeatDelay: 1.5,
      });

      tl.fromTo(
        img,
        { x: 0 },
        {
          x: -overflow,
          duration: 16,
          ease: "sine.inOut",
          force3D: true,
        }
      );

      // Restore normalized progress
      tl.progress(prevProgress);
      timelineRef.current = tl;
      Object.assign(img, {
        __panoramaTimeline: tl,
        __panoramaOverflow: overflow,
        __isReducedMotion: false,
      });

      // Resume immediately if currently visible in viewport
      if (isVisibleRef.current) {
        tl.play();
      }
    };

    // Load & decode handling
    const onImageReady = () => {
      if (!mounted) return;
      setIsLoaded(true);
      recalculateAndAnimate();
    };

    if (img.complete && img.naturalWidth > 0) {
      if (typeof img.decode === "function") {
        img.decode().then(onImageReady).catch(onImageReady);
      } else {
        onImageReady();
      }
    } else {
      img.onload = () => {
        if (typeof img.decode === "function") {
          img.decode().then(onImageReady).catch(onImageReady);
        } else {
          onImageReady();
        }
      };
      img.onerror = () => {
        if (!mounted) return;
        setHasError(true);
      };
    }

    // Viewport Visibility Control (~25% threshold)
    const intersectionObserver = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          const isSufficientlyVisible =
            entry.isIntersecting && entry.intersectionRatio >= 0.25;
          isVisibleRef.current = isSufficientlyVisible;

          if (timelineRef.current) {
            if (isSufficientlyVisible) {
              timelineRef.current.play();
            } else {
              timelineRef.current.pause();
            }
          }
        }
      },
      {
        threshold: [0, 0.25, 0.5],
      }
    );
    intersectionObserver.observe(container);

    // Responsive Recalculation with ResizeObserver & requestAnimationFrame batching
    let rafId: number | null = null;
    let lastWidth = 0;
    let lastHeight = 0;

    const resizeObserver = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        // Ignore subpixel jitter under 1px
        if (
          Math.abs(width - lastWidth) < 1 &&
          Math.abs(height - lastHeight) < 1
        ) {
          continue;
        }
        lastWidth = width;
        lastHeight = height;

        if (rafId) cancelAnimationFrame(rafId);
        rafId = requestAnimationFrame(() => {
          recalculateAndAnimate();
        });
      }
    });
    resizeObserver.observe(container);

    // Handle prefers-reduced-motion media query changes dynamically
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    const onMotionChange = () => {
      recalculateAndAnimate();
    };
    mediaQuery.addEventListener("change", onMotionChange);

    return () => {
      mounted = false;
      if (rafId) cancelAnimationFrame(rafId);
      intersectionObserver.disconnect();
      resizeObserver.disconnect();
      mediaQuery.removeEventListener("change", onMotionChange);
      if (timelineRef.current) {
        timelineRef.current.kill();
        timelineRef.current = null;
      }
    };
  }, [src]);

  return (
    <div
      ref={containerRef}
      className="visit-panorama"
      aria-hidden="true"
    >
      {/* Background fallback gradient/ambient while image is loading or if error occurs */}
      {(!isLoaded || hasError) && (
        <div className="visit-atmospheric-viewport">
          <div className="visit-ambient-base" />
          <div className="visit-ambient-glow" />
          <div className="visit-ambient-horizon" />
          <div className="visit-grain" />
        </div>
      )}

      {/* Actual Storefront Photograph */}
      {!hasError && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          className={`visit-panorama-img ${isLoaded ? "visit-panorama-img--loaded" : ""}`}
          style={{ opacity: isLoaded ? 1 : 0 }}
        />
      )}
    </div>
  );
}

"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import type { ProductGalleryImage } from "@/lib/gallery-types";
import styles from "./product-detail-gallery.module.css";

interface ProductDetailGalleryProps {
  images: ProductGalleryImage[];
  productName: string;
  autoplay?: boolean;
  intervalSeconds?: number;
}

export function ProductDetailGallery({
  images,
  productName,
  autoplay = false,
  intervalSeconds = 5,
}: ProductDetailGalleryProps) {
  // Ensure the image marked Primary in the admin portal is always the initial displayed image
  const primaryIdx = useMemo(() => {
    const idx = images.findIndex((img) => img.isPrimary);
    return idx >= 0 ? idx : 0;
  }, [images]);

  const [prevImages, setPrevImages] = useState(images);
  const [selectedIndex, setSelectedIndex] = useState<number>(primaryIdx);
  const [timerResetKey, setTimerResetKey] = useState<number>(0);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [isInteracting, setIsInteracting] = useState<boolean>(false);
  const [isTabVisible, setIsTabVisible] = useState<boolean>(true);
  const [isInViewport, setIsInViewport] = useState<boolean>(true);
  const [aspectRatio, setAspectRatio] = useState<number | null>(null);

  // Synchronize index if images prop changes between renders without cascading effects
  if (prevImages !== images) {
    setPrevImages(images);
    setSelectedIndex(primaryIdx);
  }

  // References for container intersection, swipe detection, thumbnail scrolling, and video control
  const galleryRootRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const thumbnailRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const activeImage = images[selectedIndex] ?? null;
  const totalImages = images.length;

  // Identify distinct non-video images for automatic rotation
  const distinctImages = useMemo(() => {
    const seen = new Set<string>();
    return images.filter((img) => {
      const key = img.url || img.storagePath || img.id;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [images]);

  // If a product has only one distinct photograph, the slider must remain static regardless of setting
  const canAutoplay = Boolean(
    autoplay && distinctImages.length > 1 && totalImages > 1,
  );

  // Valid interval: exactly 3, 5, or 10 seconds. Default 5 seconds.
  const intervalMs = useMemo(() => {
    const validSec =
      intervalSeconds === 3 || intervalSeconds === 5 || intervalSeconds === 10
        ? intervalSeconds
        : 5;
    return validSec * 1000;
  }, [intervalSeconds]);

  // Immediate, race-condition free selection handler
  const handleSelectImage = useCallback(
    (index: number) => {
      if (index < 0 || index >= totalImages) return;
      if (videoRef.current) videoRef.current.pause();
      setSelectedIndex(index);
      setTimerResetKey((prev) => prev + 1); // Reset timer on manual selection
    },
    [totalImages],
  );

  // Reliable wraparound navigation
  const handleNext = useCallback(() => {
    if (totalImages <= 1) return;
    if (videoRef.current) videoRef.current.pause();
    setSelectedIndex((prev: number) => (prev + 1) % totalImages);
    setTimerResetKey((prev) => prev + 1);
  }, [totalImages]);

  const handlePrev = useCallback(() => {
    if (totalImages <= 1) return;
    if (videoRef.current) videoRef.current.pause();
    setSelectedIndex((prev: number) => (prev - 1 + totalImages) % totalImages);
    setTimerResetKey((prev) => prev + 1);
  }, [totalImages]);

  // Auto-scroll active thumbnail into view
  useEffect(() => {
    const activeBtn = thumbnailRefs.current[selectedIndex];
    if (activeBtn) {
      activeBtn.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedIndex]);

  // Pause videos on unmount
  useEffect(() => {
    const activeVideo = videoRef.current;
    return () => {
      activeVideo?.pause();
    };
  }, []);

  // Track document visibility to pause autoplay when tab is inactive
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabVisible(document.visibilityState !== "hidden");
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  // Track viewport intersection to pause autoplay when scrolled out of view
  useEffect(() => {
    const el = galleryRootRef.current;
    if (!el || typeof IntersectionObserver === "undefined") return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsInViewport(entry.isIntersecting);
      },
      { threshold: 0.25 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
    };
  }, []);

  // Managed automatic image rotation timer
  useEffect(() => {
    if (!canAutoplay) return;
    if (isHovered || isInteracting || !isTabVisible || !isInViewport) return;

    // Respect user's reduced motion preference
    if (
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }

    const timer = setInterval(() => {
      setSelectedIndex((prev) => (prev + 1) % totalImages);
    }, intervalMs);

    return () => {
      clearInterval(timer);
    };
  }, [
    canAutoplay,
    intervalMs,
    totalImages,
    timerResetKey,
    isHovered,
    isInteracting,
    isTabVisible,
    isInViewport,
  ]);

  // Keyboard navigation on main stage
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    }
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    setIsInteracting(true);
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
    setIsInteracting(false);
    if (touchStartX.current === null || touchEndX.current === null) return;
    const diff = touchStartX.current - touchEndX.current;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchEndX.current = null;
  };

  // Handle zero images gracefully
  if (totalImages === 0 || !activeImage) {
    return (
      <div className={styles.galleryRoot}>
        <div className={styles.stageContainer} style={{ cursor: "default" }}>
          <div className={styles.emptyStage}>
            <svg
              className={styles.emptyStageIcon}
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
            <p className={styles.emptyStageText}>
              Showroom image pending confirmation
            </p>
          </div>
        </div>
      </div>
    );
  }

  const mediaKey = activeImage.id || activeImage.storagePath || activeImage.url;

  // Content-aware framing:
  // Square/wide studio photos (aspectRatio >= 0.85) contain outer studio margins:
  // Apply a calibrated 1.15 scale to fill ~89% of stage height with 36px top & 32px bottom clearance.
  // Tall portrait cutouts (aspectRatio < 0.85) already occupy full height: scale remains 1.0.
  const isTempPortrait =
    typeof activeImage.url === "string" &&
    activeImage.url.includes("/products/temp/");
  const isSquareOrWide =
    aspectRatio !== null ? aspectRatio >= 0.85 : !isTempPortrait;
  const effectiveScale = isSquareOrWide ? 1.15 : 1.0;

  return (
    <div
      ref={galleryRootRef}
      className={styles.galleryRoot}
      aria-label={`${productName} image gallery`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Hidden preloader for neighboring images to ensure instantaneous navigation without blank frames */}
      {totalImages > 1 && (
        <div className="sr-only" aria-hidden="true">
          {[
            images[(selectedIndex + 1) % totalImages],
            images[(selectedIndex - 1 + totalImages) % totalImages],
          ]
            .filter((img) => img && img.mediaType !== "video" && img.url)
            .map((img) => (
              <Image
                key={`preload-adj-${img.id || img.url}`}
                src={img.url}
                alt=""
                width={600}
                height={600}
                priority
              />
            ))}
        </div>
      )}

      {/* Main Image Showcase Stage */}
      <div
        className={styles.stageContainer}
        tabIndex={0}
        role={activeImage.mediaType === "video" ? "region" : "group"}
        aria-label={
          activeImage.mediaType === "video"
            ? `${activeImage.altText || productName} video player`
            : `${activeImage.altText || productName} photograph ${selectedIndex + 1} of ${totalImages}`
        }
        onKeyDown={handleKeyDown}
        onTouchStart={
          activeImage.mediaType === "video" ? undefined : handleTouchStart
        }
        onTouchMove={
          activeImage.mediaType === "video" ? undefined : handleTouchMove
        }
        onTouchEnd={
          activeImage.mediaType === "video" ? undefined : handleTouchEnd
        }
      >
        {activeImage.mediaType === "video" ? (
          <div className={styles.stageVideoWrap}>
            <video
              key={`video-${mediaKey}`}
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              poster={activeImage.posterUrl}
              src={activeImage.url}
              aria-label={
                activeImage.altText ||
                `${productName} product demonstration video`
              }
              className={styles.stageVideo}
            />
          </div>
        ) : (
          <div
            className={styles.stageImageWrap}
            style={
              { "--detail-scale": effectiveScale } as React.CSSProperties
            }
          >
            {activeImage.url.startsWith("/") ? (
              <Image
                key={`stage-${mediaKey}`}
                src={activeImage.url}
                alt={activeImage.altText || productName}
                fill
                priority
                sizes="(max-width: 768px) 96vw, (max-width: 1200px) 58vw, 680px"
                className={`${styles.stageImage} ${styles.stageImageActive}`}
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget;
                  if (naturalWidth && naturalHeight) {
                    setAspectRatio(naturalWidth / naturalHeight);
                  }
                }}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={`stage-img-${mediaKey}`}
                src={activeImage.url}
                alt={activeImage.altText || productName}
                className={`${styles.stageImage} ${styles.stageImageActive}`}
                style={{ width: "100%", height: "100%" }}
                onLoad={(e) => {
                  const { naturalWidth, naturalHeight } = e.currentTarget;
                  if (naturalWidth && naturalHeight) {
                    setAspectRatio(naturalWidth / naturalHeight);
                  }
                }}
              />
            )}
          </div>
        )}

        {/* Navigation Arrows for Multiple Images/Videos */}
        {totalImages > 1 && (
          <>
            <button
              type="button"
              className={`${styles.stageArrow} ${styles.stageArrowPrev}`}
              aria-label="Previous gallery photograph"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.stageArrow} ${styles.stageArrowNext}`}
              aria-label="Next gallery photograph"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        {/* Counter Badge */}
        {totalImages > 1 && (
          <div className={styles.counterBadge} aria-live="polite">
            {selectedIndex + 1} / {totalImages}
          </div>
        )}
      </div>

      {/* Thumbnail Strip (Hidden if single item) */}
      {totalImages > 1 && (
        <div
          className={styles.thumbnailStrip}
          role="tablist"
          aria-label="Gallery navigation thumbnails"
        >
          {images.map((img, idx) => {
            const isSelected = idx === selectedIndex;
            const isVideo = img.mediaType === "video";
            return (
              <button
                key={img.id || idx}
                ref={(el) => {
                  thumbnailRefs.current[idx] = el;
                }}
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={
                  isVideo
                    ? `Show video demonstration ${idx + 1} of ${totalImages}`
                    : `Show photograph ${idx + 1} of ${totalImages}`
                }
                className={`${styles.thumbnailButton} ${
                  isSelected ? styles.thumbnailActive : ""
                }`}
                onClick={() => handleSelectImage(idx)}
              >
                {img.posterUrl ? (
                  <Image
                    src={img.posterUrl}
                    alt=""
                    fill
                    sizes="76px"
                    className={styles.thumbnailImage}
                  />
                ) : img.url.startsWith("/") &&
                  !img.url.endsWith(".mp4") &&
                  !img.url.endsWith(".webm") ? (
                  <Image
                    src={img.url}
                    alt=""
                    fill
                    sizes="76px"
                    className={styles.thumbnailImage}
                  />
                ) : isVideo ? (
                  <div
                    className={styles.thumbnailImage}
                    style={{
                      width: "100%",
                      height: "100%",
                      backgroundColor: "#161b1e",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={img.url}
                    alt=""
                    className={styles.thumbnailImage}
                  />
                )}

                {/* Video Play Icon Overlay */}
                {isVideo && (
                  <span
                    className={styles.thumbnailPlayOverlay}
                    aria-hidden="true"
                  >
                    <svg
                      className={styles.thumbnailPlayIcon}
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <polygon points="8 5 19 12 8 19" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

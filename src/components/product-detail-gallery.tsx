"use client";

import Image from "next/image";
import { useState, useEffect, useRef, useCallback } from "react";
import type { ProductGalleryImage } from "@/lib/gallery-types";
import styles from "./product-detail-gallery.module.css";

interface ProductDetailGalleryProps {
  images: ProductGalleryImage[];
  productName: string;
}

export function ProductDetailGallery({ images, productName }: ProductDetailGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // References for focus restoration, swipe detection, and video control
  const expandButtonRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const lightboxVideoRef = useRef<HTMLVideoElement>(null);
  const touchStartX = useRef<number | null>(null);
  const touchEndX = useRef<number | null>(null);

  const activeImage = images[selectedIndex] ?? null;
  const totalImages = images.length;

  const handleSelectImage = useCallback(
    (index: number) => {
      if (index === selectedIndex || index < 0 || index >= totalImages) return;
      // Pause any actively playing video before transition
      if (videoRef.current) {
        videoRef.current.pause();
      }
      if (lightboxVideoRef.current) {
        lightboxVideoRef.current.pause();
      }
      setIsTransitioning(true);
      setTimeout(() => {
        setSelectedIndex(index);
        setIsTransitioning(false);
      }, 120);
    },
    [selectedIndex, totalImages],
  );

  const handleNext = useCallback(() => {
    if (totalImages <= 1) return;
    handleSelectImage((selectedIndex + 1) % totalImages);
  }, [selectedIndex, totalImages, handleSelectImage]);

  const handlePrev = useCallback(() => {
    if (totalImages <= 1) return;
    handleSelectImage((selectedIndex - 1 + totalImages) % totalImages);
  }, [selectedIndex, totalImages, handleSelectImage]);

  // Pause videos on page leave or unmount
  useEffect(() => {
    const activeVideo = videoRef.current;
    const activeLightboxVideo = lightboxVideoRef.current;
    return () => {
      activeVideo?.pause();
      activeLightboxVideo?.pause();
    };
  }, []);

  // Keyboard navigation on main stage
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      handleNext();
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      handlePrev();
    } else if (e.key === "Enter" || e.key === " ") {
      if (activeImage?.mediaType !== "video") {
        e.preventDefault();
        setIsLightboxOpen(true);
      }
    }
  };

  // Touch swipe support for mobile
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.targetTouches[0].clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    touchEndX.current = e.targetTouches[0].clientX;
  };

  const handleTouchEnd = () => {
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

  // Lightbox key listeners & scroll lock
  useEffect(() => {
    if (!isLightboxOpen) return;

    const originalOverflow = document.body.style.overflow;
    const triggerEl = expandButtonRef.current;
    document.body.style.overflow = "hidden";

    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsLightboxOpen(false);
      } else if (e.key === "ArrowRight") {
        handleNext();
      } else if (e.key === "ArrowLeft") {
        handlePrev();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);

    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener("keydown", handleGlobalKeyDown);
      triggerEl?.focus();
    };
  }, [isLightboxOpen, handleNext, handlePrev]);

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
            <p className={styles.emptyStageText}>Showroom image pending confirmation</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.galleryRoot} aria-label={`${productName} image gallery`}>
      {/* Main Image Showcase Stage */}
      <div
        className={styles.stageContainer}
        tabIndex={0}
        role={activeImage.mediaType === "video" ? "region" : "button"}
        aria-label={
          activeImage.mediaType === "video"
            ? `${activeImage.altText || productName} video player`
            : `View enlarged ${activeImage.altText || productName}`
        }
        onClick={() => {
          if (activeImage.mediaType !== "video") {
            setIsLightboxOpen(true);
          }
        }}
        onKeyDown={handleKeyDown}
        onTouchStart={activeImage.mediaType === "video" ? undefined : handleTouchStart}
        onTouchMove={activeImage.mediaType === "video" ? undefined : handleTouchMove}
        onTouchEnd={activeImage.mediaType === "video" ? undefined : handleTouchEnd}
      >
        {activeImage.mediaType === "video" ? (
          <div className={styles.stageVideoWrap}>
            <video
              ref={videoRef}
              controls
              playsInline
              preload="metadata"
              poster={activeImage.posterUrl}
              src={activeImage.url}
              aria-label={activeImage.altText || `${productName} product demonstration video`}
              className={styles.stageVideo}
            />
          </div>
        ) : (
          <div className={styles.stageImageWrap}>
            {activeImage.url.startsWith("/") ? (
              <Image
                src={activeImage.url}
                alt={activeImage.altText || productName}
                fill
                priority={selectedIndex === 0}
                sizes="(max-width: 768px) 92vw, (max-width: 1200px) 46vw, 560px"
                className={`${styles.stageImage} ${
                  isTransitioning ? styles.stageImageLoading : styles.stageImageActive
                }`}
              />
            ) : (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={activeImage.url}
                alt={activeImage.altText || productName}
                className={`${styles.stageImage} ${
                  isTransitioning ? styles.stageImageLoading : styles.stageImageActive
                }`}
                style={{ width: "100%", height: "100%" }}
              />
            )}
          </div>
        )}

        {/* Expand / Lightbox Trigger Button */}
        <button
          type="button"
          ref={expandButtonRef}
          className={styles.expandButton}
          aria-label={activeImage.mediaType === "video" ? "Expand video viewer" : "Enlarge image"}
          onClick={(e) => {
            e.stopPropagation();
            setIsLightboxOpen(true);
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 3 21 3 21 9" />
            <polyline points="9 21 3 21 3 15" />
            <line x1="21" y1="3" x2="14" y2="10" />
            <line x1="3" y1="21" x2="10" y2="14" />
          </svg>
        </button>

        {/* Navigation Arrows for Multiple Images/Videos */}
        {totalImages > 1 && (
          <>
            <button
              type="button"
              className={`${styles.stageArrow} ${styles.stageArrowPrev}`}
              aria-label="Previous gallery item"
              onClick={(e) => {
                e.stopPropagation();
                handlePrev();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              className={`${styles.stageArrow} ${styles.stageArrowNext}`}
              aria-label="Next gallery item"
              onClick={(e) => {
                e.stopPropagation();
                handleNext();
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}

        {/* Counter Badge */}
        {totalImages > 1 && (
          <div className={styles.counterBadge}>
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
                type="button"
                role="tab"
                aria-selected={isSelected}
                aria-label={
                  isVideo
                    ? `Show video demonstration ${idx + 1} of ${totalImages}`
                    : `Show image ${idx + 1} of ${totalImages}`
                }
                className={`${styles.thumbnailButton} ${isSelected ? styles.thumbnailActive : ""}`}
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
                ) : img.url.startsWith("/") && !img.url.endsWith(".mp4") && !img.url.endsWith(".webm") ? (
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

                {/* Obvious Video Play Icon Overlay */}
                {isVideo && (
                  <span className={styles.thumbnailPlayOverlay} aria-hidden="true">
                    <svg className={styles.thumbnailPlayIcon} viewBox="0 0 24 24" fill="currentColor">
                      <polygon points="8 5 19 12 8 19" />
                    </svg>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* Fullscreen Lightbox Modal */}
      {isLightboxOpen && (
        <div
          className={styles.lightboxOverlay}
          role="dialog"
          aria-modal="true"
          aria-label={`${productName} media viewer`}
          onClick={() => {
            lightboxVideoRef.current?.pause();
            setIsLightboxOpen(false);
          }}
        >
          <div className={styles.lightboxContent} onClick={(e) => e.stopPropagation()}>
            {/* Close Button */}
            <button
              type="button"
              className={styles.lightboxCloseButton}
              aria-label="Close media viewer"
              onClick={() => {
                lightboxVideoRef.current?.pause();
                setIsLightboxOpen(false);
              }}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>

            {/* Modal Stage (Image or Video) */}
            <div className={styles.lightboxImageStage}>
              {activeImage.mediaType === "video" ? (
                <video
                  ref={lightboxVideoRef}
                  controls
                  playsInline
                  autoPlay
                  preload="metadata"
                  src={activeImage.url}
                  poster={activeImage.posterUrl}
                  aria-label={activeImage.altText || `${productName} video demonstration`}
                  className={styles.lightboxVideo}
                />
              ) : activeImage.url.startsWith("/") ? (
                <Image
                  src={activeImage.url}
                  alt={activeImage.altText || productName}
                  fill
                  sizes="92vw"
                  className={styles.lightboxImage}
                />
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={activeImage.url}
                  alt={activeImage.altText || productName}
                  className={styles.lightboxImage}
                />
              )}
            </div>

            {/* Modal Prev/Next Navigation */}
            {totalImages > 1 && (
              <>
                <button
                  type="button"
                  className={`${styles.lightboxArrow} ${styles.lightboxArrowPrev}`}
                  aria-label="Previous media"
                  onClick={handlePrev}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="15 18 9 12 15 6" />
                  </svg>
                </button>
                <button
                  type="button"
                  className={`${styles.lightboxArrow} ${styles.lightboxArrowNext}`}
                  aria-label="Next media"
                  onClick={handleNext}
                >
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              </>
            )}

            {/* Modal Footer Info */}
            <div className={styles.lightboxFooter}>
              <span className={styles.lightboxCaption}>{activeImage.altText || productName}</span>
              {totalImages > 1 && (
                <span className={styles.lightboxCounter}>
                  {selectedIndex + 1} / {totalImages}
                </span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

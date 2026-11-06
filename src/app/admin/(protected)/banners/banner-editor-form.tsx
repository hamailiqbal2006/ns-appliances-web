/* eslint-disable @next/next/no-img-element -- previews use browser object URLs and the app's private media stream. */
"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { HomepageBanner } from "@/lib/homepage-banners";
import { saveHomepageBannersAction } from "../../actions";
import styles from "../../admin.module.css";

type EditorBanner = HomepageBanner & {
  desktopPreviewUrl: string | null;
  desktopDimensions: { width: number; height: number } | null;
  removeDesktopArtwork: boolean;
  mobilePreviewUrl: string | null;
  mobileDimensions: { width: number; height: number } | null;
  removeMobileArtwork: boolean;
};

const prepare = (banners: HomepageBanner[]): EditorBanner[] =>
  banners.map((banner) => ({
    ...banner,
    desktopPreviewUrl: banner.imageUrl,
    desktopDimensions: null,
    removeDesktopArtwork: false,
    mobilePreviewUrl: banner.mobileImageUrl,
    mobileDimensions: null,
    removeMobileArtwork: false,
  }));

export function BannerEditorForm({
  banners,
  isReady,
  supportsMobileImage = true,
}: {
  banners: HomepageBanner[];
  isReady: boolean;
  supportsMobileImage?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveHomepageBannersAction, { error: null });
  const [items, setItems] = useState<EditorBanner[]>(() => prepare(banners));
  const [fileError, setFileError] = useState<string | null>(null);
  const [previewMode, setPreviewMode] = useState<Record<string, "desktop" | "mobile" | "both">>({
    brand: "both",
    climate: "both",
    utility: "both",
  });

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  const configuration = useMemo(
    () =>
      JSON.stringify(
        items.map((item, sort_order) => ({
          slot_key: item.id,
          sort_order,
          remove_desktop_artwork: item.removeDesktopArtwork,
          remove_mobile_artwork: item.removeMobileArtwork,
        })),
      ),
    [items],
  );

  const move = (index: number, direction: -1 | 1) =>
    setItems((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });

  const chooseDesktopArtwork = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError(null);
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      event.target.value = "";
      setFileError("Use a JPEG, PNG, or WebP desktop image up to 5 MB.");
      return;
    }

    const image = new Image();
    const previewUrl = URL.createObjectURL(file);
    image.onload = () => {
      if (
        image.naturalWidth < 960 ||
        image.naturalHeight < 540 ||
        image.naturalWidth > 6000 ||
        image.naturalHeight > 6000
      ) {
        event.target.value = "";
        URL.revokeObjectURL(previewUrl);
        setFileError("Desktop banner images must be between 960 × 540 and 6000 × 6000 pixels (recommended 1920 × 1080 px, 16:9).");
        return;
      }
      setItems((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                desktopPreviewUrl: previewUrl,
                desktopDimensions: { width: image.naturalWidth, height: image.naturalHeight },
                removeDesktopArtwork: false,
              }
            : item,
        ),
      );
    };
    image.onerror = () => {
      event.target.value = "";
      URL.revokeObjectURL(previewUrl);
      setFileError("That desktop image file could not be read.");
    };
    image.src = previewUrl;
  };

  const chooseMobileArtwork = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError(null);
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      event.target.value = "";
      setFileError("Use a JPEG, PNG, or WebP mobile image up to 5 MB.");
      return;
    }

    const image = new Image();
    const previewUrl = URL.createObjectURL(file);
    image.onload = () => {
      if (
        image.naturalWidth < 540 ||
        image.naturalHeight < 540 ||
        image.naturalWidth > 6000 ||
        image.naturalHeight > 6000
      ) {
        event.target.value = "";
        URL.revokeObjectURL(previewUrl);
        setFileError("Mobile banner images must be between 540 × 540 and 6000 × 6000 pixels (recommended 1080 × 1920 px, 9:16).");
        return;
      }
      setItems((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index
            ? {
                ...item,
                mobilePreviewUrl: previewUrl,
                mobileDimensions: { width: image.naturalWidth, height: image.naturalHeight },
                removeMobileArtwork: false,
              }
            : item,
        ),
      );
    };
    image.onerror = () => {
      event.target.value = "";
      URL.revokeObjectURL(previewUrl);
      setFileError("That mobile image file could not be read.");
    };
    image.src = previewUrl;
  };

  return (
    <form className={styles.editorForm} action={formAction} noValidate>
      <fieldset>
        <legend>Approved Rotating Hero Slots (3 ambient slides with Dual Desktop &amp; Mobile Artwork)</legend>

        {!isReady ? (
          <div className={styles.setupNotice} style={{ marginTop: "16px" }}>
            Banner changes are safely blocked until <code>supabase/migrations/20261029_homepage_banners.sql</code> is applied. The public storefront uses its default ambient fallback.
          </div>
        ) : null}

        {!supportsMobileImage ? (
          <div className={styles.setupNotice} style={{ marginTop: "16px", borderColor: "#f59e0b", background: "#fffbeb" }}>
            <strong>Note:</strong> Apply <code>supabase/migrations/20261106_dual_responsive_banners.sql</code> in your Supabase SQL Editor to persist independent mobile banner images. Existing desktop banners continue displaying normally.
          </div>
        ) : null}

        <input type="hidden" name="banner_configuration" value={configuration} />

        <div className={styles.bannerEditorList}>
          {items.map((item, index) => {
            const slotTitle =
              item.id === "brand"
                ? "Brand Ambience"
                : item.id === "climate"
                ? "Climate Ambience"
                : "Utility Ambience";

            const cardMode = previewMode[item.id] || "both";
            const effectiveDesktopSrc = !item.removeDesktopArtwork ? item.desktopPreviewUrl : null;
            const effectiveMobileSrc = !item.removeMobileArtwork ? item.mobilePreviewUrl : null;
            const mobileIsUsingDesktopFallback = !effectiveMobileSrc && !!effectiveDesktopSrc;
            const renderedMobileSrc = effectiveMobileSrc || (mobileIsUsingDesktopFallback ? effectiveDesktopSrc : null);

            return (
              <section className={styles.bannerEditorCard} key={item.id}>
                {/* PREVIEW STAGE WITH DESKTOP | MOBILE SWITCH */}
                <div className={styles.bannerPreviewContainer}>
                  <div className={styles.bannerPreviewHeader}>
                    <p className={styles.kicker} style={{ margin: 0 }}>
                      Live Crop Preview ({slotTitle})
                    </p>
                    <div className={styles.bannerPreviewSwitch} role="group" aria-label="Preview viewport toggle">
                      <button
                        type="button"
                        className={`${styles.bannerSwitchBtn} ${cardMode === "desktop" ? styles.bannerSwitchBtnActive : ""}`}
                        onClick={() => setPreviewMode((prev) => ({ ...prev, [item.id]: "desktop" }))}
                      >
                        Desktop
                      </button>
                      <button
                        type="button"
                        className={`${styles.bannerSwitchBtn} ${cardMode === "mobile" ? styles.bannerSwitchBtnActive : ""}`}
                        onClick={() => setPreviewMode((prev) => ({ ...prev, [item.id]: "mobile" }))}
                      >
                        Mobile
                      </button>
                      <button
                        type="button"
                        className={`${styles.bannerSwitchBtn} ${cardMode === "both" ? styles.bannerSwitchBtnActive : ""}`}
                        onClick={() => setPreviewMode((prev) => ({ ...prev, [item.id]: "both" }))}
                      >
                        Both
                      </button>
                    </div>
                  </div>

                  <div className={styles.bannerPreviewStage}>
                    <div className={styles.bannerPreviewRow}>
                      {(cardMode === "desktop" || cardMode === "both") && (
                        <div
                          className={styles.bannerDesktopPreview}
                          style={{ background: item.palette.primary }}
                          aria-label={`Desktop preview for ${slotTitle}`}
                        >
                          {effectiveDesktopSrc ? (
                            <img src={effectiveDesktopSrc} alt="" />
                          ) : null}
                          <span>Desktop (16:9)</span>
                        </div>
                      )}

                      {(cardMode === "mobile" || cardMode === "both") && (
                        <div
                          className={styles.bannerMobilePreview}
                          style={{ background: item.palette.primary }}
                          aria-label={`Mobile preview for ${slotTitle}`}
                        >
                          {renderedMobileSrc ? (
                            <img src={renderedMobileSrc} alt="" />
                          ) : null}
                          {mobileIsUsingDesktopFallback ? (
                            <div className={styles.bannerFallbackBadge} title="Mobile artwork not uploaded; using desktop artwork as fallback">
                              Fallback
                            </div>
                          ) : null}
                          <span>Mobile (9:16)</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* DETAILS & DUAL UPLOAD CONTROLS */}
                <div className={styles.bannerEditorDetails}>
                  <div>
                    <p className={styles.kicker}>Rotation Position {index + 1} of 3</p>
                    <h2>{slotTitle}</h2>
                  </div>

                  <div className={styles.bannerDualUploadGrid}>
                    {/* 1. DESKTOP IMAGE CONTROLS */}
                    <div className={styles.bannerUploadBox}>
                      <div className={styles.bannerUploadBoxHeader}>
                        <span className={styles.bannerUploadBoxTitle}>Desktop Image</span>
                        {effectiveDesktopSrc ? (
                          <span className={styles.bannerBadgeSuccess}>Active</span>
                        ) : (
                          <span className={styles.bannerBadgeMuted}>Ambient Gradient</span>
                        )}
                      </div>
                      <div className={styles.bannerUploadBoxSpec}>
                        Recommended: 1920 × 1080 px (16:9) &bull; Max 5 MB
                      </div>
                      {item.desktopDimensions ? (
                        <div className={styles.bannerDimensions}>
                          Uploaded: {item.desktopDimensions.width} × {item.desktopDimensions.height} px
                        </div>
                      ) : null}

                      <label className={styles.bannerFileLabel}>
                        <input
                          name={`banner_desktop_${item.id}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={!isReady || pending}
                          onChange={(event) => chooseDesktopArtwork(index, event)}
                        />
                      </label>

                      {effectiveDesktopSrc ? (
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          style={{ minHeight: "28px", padding: "2px 8px", fontSize: "11px", justifySelf: "start" }}
                          disabled={!isReady || pending}
                          onClick={() =>
                            setItems((current) =>
                              current.map((entry, itemIndex) =>
                                itemIndex === index
                                  ? { ...entry, removeDesktopArtwork: true, desktopPreviewUrl: null, desktopDimensions: null }
                                  : entry,
                              ),
                            )
                          }
                        >
                          Remove Desktop Artwork
                        </button>
                      ) : null}

                      {item.removeDesktopArtwork ? (
                        <p className={styles.fieldHelp} style={{ color: "#b45309", fontSize: "11px", margin: 0 }}>
                          Desktop artwork will be removed after saving; default ambient background will apply.
                        </p>
                      ) : null}
                    </div>

                    {/* 2. MOBILE IMAGE CONTROLS */}
                    <div className={styles.bannerUploadBox}>
                      <div className={styles.bannerUploadBoxHeader}>
                        <span className={styles.bannerUploadBoxTitle}>Mobile Image</span>
                        {effectiveMobileSrc ? (
                          <span className={styles.bannerBadgeSuccess}>Custom Mobile</span>
                        ) : effectiveDesktopSrc ? (
                          <span className={styles.bannerBadgeWarning}>Desktop Fallback</span>
                        ) : (
                          <span className={styles.bannerBadgeMuted}>Ambient Gradient</span>
                        )}
                      </div>
                      <div className={styles.bannerUploadBoxSpec}>
                        Recommended: 1080 × 1920 px (9:16) &bull; Max 5 MB
                      </div>
                      {item.mobileDimensions ? (
                        <div className={styles.bannerDimensions}>
                          Uploaded: {item.mobileDimensions.width} × {item.mobileDimensions.height} px
                        </div>
                      ) : null}

                      {!effectiveMobileSrc && (
                        <p className={styles.fieldHelp} style={{ margin: 0, fontSize: "11.5px", color: effectiveDesktopSrc ? "#b45309" : "#61716d" }}>
                          {effectiveDesktopSrc
                            ? "Mobile image not added — phone viewports will display the desktop image."
                            : "No mobile image uploaded."}
                        </p>
                      )}

                      <label className={styles.bannerFileLabel}>
                        <input
                          name={`banner_mobile_${item.id}`}
                          type="file"
                          accept="image/jpeg,image/png,image/webp"
                          disabled={!isReady || pending}
                          onChange={(event) => chooseMobileArtwork(index, event)}
                        />
                      </label>

                      {effectiveMobileSrc ? (
                        <button
                          type="button"
                          className={styles.secondaryButton}
                          style={{ minHeight: "28px", padding: "2px 8px", fontSize: "11px", justifySelf: "start" }}
                          disabled={!isReady || pending}
                          onClick={() =>
                            setItems((current) =>
                              current.map((entry, itemIndex) =>
                                itemIndex === index
                                  ? { ...entry, removeMobileArtwork: true, mobilePreviewUrl: null, mobileDimensions: null }
                                  : entry,
                              ),
                            )
                          }
                        >
                          Remove Mobile Artwork
                        </button>
                      ) : null}

                      {item.removeMobileArtwork ? (
                        <p className={styles.fieldHelp} style={{ color: "#b45309", fontSize: "11px", margin: 0 }}>
                          Mobile artwork will be removed after saving; desktop artwork fallback will apply.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {/* ORDER CONTROLS */}
                  <div className={styles.bannerOrderControls}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      style={{ minHeight: "32px", padding: "4px 10px", fontSize: "12px" }}
                      disabled={!isReady || pending || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      &uarr; Move earlier
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      style={{ minHeight: "32px", padding: "4px 10px", fontSize: "12px" }}
                      disabled={!isReady || pending || index === items.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      &darr; Move later
                    </button>
                  </div>
                </div>
              </section>
            );
          })}
        </div>
      </fieldset>

      {fileError ? (
        <p className={styles.formError} role="alert">
          {fileError}
        </p>
      ) : null}

      {state.error ? (
        <p className={styles.formError} role="alert">
          {state.error}
        </p>
      ) : null}

      {state.success ? (
        <p className={styles.formSuccess} role="status">
          Homepage banners saved successfully.
        </p>
      ) : null}

      <div className={styles.formActions}>
        <button className={styles.primaryButton} type="submit" disabled={!isReady || pending}>
          {pending ? "Saving banners…" : "Save homepage banners"}
        </button>
      </div>
    </form>
  );
}

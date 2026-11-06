/* eslint-disable @next/next/no-img-element -- previews use browser object URLs and the app's private media stream. */
"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { HomepageBanner, HomepageSliderSettings } from "@/lib/homepage-banners";
import { saveHomepageBannersAction, saveBannerSliderSettingsAction } from "../../actions";
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
    isEnabled: banner.isEnabled !== false,
  }));

function BannerSliderSettingsCard({
  sliderSettings,
  isSettingsReady,
  enabledBannerCount,
}: {
  sliderSettings: HomepageSliderSettings;
  isSettingsReady: boolean;
  enabledBannerCount: number;
}) {
  const [state, formAction, pending] = useActionState(saveBannerSliderSettingsAction, { error: null });
  const [bannerCount, setBannerCount] = useState<number>(sliderSettings.bannerCount);
  const [intervalType, setIntervalType] = useState<string>(() => {
    const common = [3, 5, 7, 10, 15];
    return common.includes(sliderSettings.intervalSeconds) ? String(sliderSettings.intervalSeconds) : "custom";
  });
  const [customInterval, setCustomInterval] = useState<number>(sliderSettings.intervalSeconds);

  const effectiveInterval = intervalType === "custom" ? customInterval : Number(intervalType);

  // Available banner count choices (1 up to total enabled banners)
  const maxChoice = Math.max(1, enabledBannerCount);
  const countOptions = Array.from({ length: maxChoice }, (_, i) => i + 1);

  return (
    <section className={styles.sliderSettingsCard} aria-labelledby="slider-settings-title">
      <div className={styles.sliderSettingsHeader}>
        <div>
          <h2 id="slider-settings-title" className={styles.sliderSettingsTitle}>
            Banner Slider Settings
          </h2>
          <p className={styles.sliderSettingsSubtitle}>
            Configure how many banners are included in the homepage rotation and how frequently they transition.
          </p>
        </div>
      </div>

      {!isSettingsReady ? (
        <div
          className={styles.setupNotice}
          style={{ margin: "16px 0", borderColor: "#38bdf8", background: "#f0f9ff" }}
        >
          <strong>Database Notice:</strong> Table <code>public.homepage_banner_settings</code> is not yet configured. Run{" "}
          <code>supabase/migrations/20261106_homepage_slider_settings.sql</code> in your Supabase SQL Editor to persist
          custom slider settings. Current defaults (3 banners, 5s) are active.
        </div>
      ) : null}

      <form action={formAction} className={styles.sliderSettingsForm} noValidate>
        <div className={styles.sliderSettingsGrid}>
          {/* Setting A: Number of Banners to Display */}
          <div className={styles.sliderSettingsField}>
            <label htmlFor="banner_count" className={styles.sliderSettingsLabel}>
              Number of Banners to Display:
            </label>
            <select
              id="banner_count"
              name="banner_count"
              className={styles.sliderSettingsSelect}
              value={Math.min(bannerCount, maxChoice)}
              onChange={(e) => setBannerCount(Number(e.target.value))}
            >
              {countOptions.map((n) => (
                <option key={n} value={n}>
                  {n === 1 ? "1 banner (Autoplay off)" : `${n} banners`}
                </option>
              ))}
            </select>
            <p className={styles.sliderSettingsHelp}>
              {bannerCount === 1
                ? "Displays only the first active banner. Automatic slide rotation is paused."
                : `Rotates between the first ${Math.min(bannerCount, maxChoice)} enabled banners in configured display order.`}
            </p>
          </div>

          {/* Setting B: Change Banner Every */}
          <div className={styles.sliderSettingsField}>
            <label htmlFor="interval_preset" className={styles.sliderSettingsLabel}>
              Change Banner Every:
            </label>
            <div className={styles.sliderIntervalGroup}>
              <select
                id="interval_preset"
                className={styles.sliderSettingsSelect}
                value={intervalType}
                onChange={(e) => {
                  setIntervalType(e.target.value);
                  if (e.target.value !== "custom") {
                    setCustomInterval(Number(e.target.value));
                  }
                }}
              >
                <option value="3">3 seconds</option>
                <option value="5">5 seconds (Default)</option>
                <option value="7">7 seconds</option>
                <option value="10">10 seconds</option>
                <option value="15">15 seconds</option>
                <option value="custom">Custom interval…</option>
              </select>

              {intervalType === "custom" ? (
                <div className={styles.sliderCustomIntervalInputWrapper}>
                  <input
                    type="number"
                    min="2"
                    max="30"
                    step="1"
                    className={styles.sliderCustomIntervalInput}
                    value={customInterval}
                    onChange={(e) => setCustomInterval(Math.max(2, Math.min(30, Number(e.target.value) || 5)))}
                    aria-label="Custom seconds"
                  />
                  <span className={styles.sliderCustomIntervalSuffix}>sec</span>
                </div>
              ) : null}
            </div>

            {/* Hidden field passing the validated effective seconds to server action */}
            <input type="hidden" name="interval_seconds" value={effectiveInterval} />

            <p className={styles.sliderSettingsHelp}>
              Each banner remains visible for {effectiveInterval} seconds before transitioning to the next.
            </p>
          </div>
        </div>

        {/* Feedback Messages */}
        {state.success ? (
          <p className={styles.formSuccess} role="status" style={{ margin: "4px 0" }}>
            ✓ Banner slider settings saved successfully. Homepage updates automatically on next visit.
          </p>
        ) : null}

        {state.error ? (
          <p className={styles.formError} role="alert" style={{ margin: "4px 0" }}>
            {state.error}
          </p>
        ) : null}

        <div className={styles.sliderSettingsActions}>
          <button type="submit" className={styles.primaryButton} disabled={pending}>
            {pending ? "Saving Settings…" : "Save Settings"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function BannerEditorForm({
  banners,
  isReady,
  supportsMobileImage = true,
  supportsEnabledToggle = true,
  sliderSettings = { bannerCount: 3, intervalSeconds: 5 },
  isSettingsReady = true,
}: {
  banners: HomepageBanner[];
  isReady: boolean;
  supportsMobileImage?: boolean;
  supportsEnabledToggle?: boolean;
  sliderSettings?: HomepageSliderSettings;
  isSettingsReady?: boolean;
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
          is_enabled: item.isEnabled,
        })),
      ),
    [items],
  );

  const enabledBannerCount = useMemo(() => items.filter((b) => b.isEnabled).length, [items]);

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
        image.naturalWidth < 480 ||
        image.naturalHeight < 800 ||
        image.naturalWidth > 4000 ||
        image.naturalHeight > 6000
      ) {
        event.target.value = "";
        URL.revokeObjectURL(previewUrl);
        setFileError("Mobile banner images must be between 480 × 800 and 4000 × 6000 pixels (recommended 1080 × 1920 px, 9:16).");
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
    <>
      {/* 1. BANNER SLIDER SETTINGS (SEPARATE INDEPENDENT CONTROLS) */}
      <BannerSliderSettingsCard
        key={`${sliderSettings.bannerCount}-${sliderSettings.intervalSeconds}`}
        sliderSettings={sliderSettings}
        isSettingsReady={isSettingsReady}
        enabledBannerCount={enabledBannerCount}
      />

      {/* 2. BANNER INDIVIDUAL SLOTS & ARTWORK MANAGER */}
      <form className={styles.editorForm} action={formAction} noValidate>
        <fieldset>
          <legend>Approved Rotating Hero Slots ({items.length} ambient slides with Dual Desktop &amp; Mobile Artwork)</legend>

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
                  : item.id === "utility"
                  ? "Utility Ambience"
                  : `Custom Banner (${item.id})`;

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
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "8px" }}>
                      <div>
                        <p className={styles.kicker} style={{ margin: 0 }}>Rotation Position {index + 1} of {items.length}</p>
                        <h2 style={{ margin: "2px 0 0" }}>{slotTitle}</h2>
                      </div>
                      {supportsEnabledToggle ? (
                        <label className={styles.bannerEnabledCheckboxLabel}>
                          <input
                            type="checkbox"
                            checked={item.isEnabled}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              setItems((prev) =>
                                prev.map((entry) =>
                                  entry.id === item.id ? { ...entry, isEnabled: checked } : entry
                                )
                              );
                            }}
                          />
                          <span>Active in rotation</span>
                        </label>
                      ) : null}
                    </div>

                    <div className={styles.bannerDualUploadGrid}>
                      {/* 1. DESKTOP IMAGE CONTROLS */}
                      <div className={styles.bannerUploadBox}>
                        <div className={styles.bannerUploadBoxHeader}>
                          <span className={styles.bannerUploadBoxTitle}>Desktop Banner Image</span>
                          <span className={styles.bannerUploadBoxSpec}>1920 &times; 1080 (16:9)</span>
                        </div>
                        {effectiveDesktopSrc ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className={styles.bannerBadgeSuccess}>Uploaded</span>
                            <span style={{ fontSize: "11px", color: "#61716d" }}>
                              {item.desktopDimensions
                                ? `${item.desktopDimensions.width} × ${item.desktopDimensions.height} px`
                                : "Active in storage"}
                            </span>
                          </div>
                        ) : (
                          <span className={styles.bannerBadgeMuted}>None (Uses Ambient Gradient)</span>
                        )}

                        <label className={styles.fileButton} style={{ alignSelf: "start", marginTop: "4px" }}>
                          <input
                            type="file"
                            name={`banner_desktop_${item.id}`}
                            accept="image/jpeg,image/png,image/webp"
                            disabled={!isReady || pending}
                            onChange={(event) => chooseDesktopArtwork(index, event)}
                          />
                          {effectiveDesktopSrc ? "Replace Desktop File" : "Choose Desktop File"}
                        </label>

                        {effectiveDesktopSrc ? (
                          <button
                            type="button"
                            className={styles.bannerRemoveLink}
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
                            Desktop artwork will be removed after saving; default ambient will apply.
                          </p>
                        ) : null}
                      </div>

                      {/* 2. MOBILE IMAGE CONTROLS */}
                      <div className={styles.bannerUploadBox}>
                        <div className={styles.bannerUploadBoxHeader}>
                          <span className={styles.bannerUploadBoxTitle}>Mobile Banner Image</span>
                          <span className={styles.bannerUploadBoxSpec}>1080 &times; 1920 (9:16)</span>
                        </div>
                        {effectiveMobileSrc ? (
                          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                            <span className={styles.bannerBadgeSuccess}>Uploaded</span>
                            <span style={{ fontSize: "11px", color: "#61716d" }}>
                              {item.mobileDimensions
                                ? `${item.mobileDimensions.width} × ${item.mobileDimensions.height} px`
                                : "Active in storage"}
                            </span>
                          </div>
                        ) : (
                          <span className={styles.bannerBadgeMuted}>
                            {effectiveDesktopSrc ? "Fallback: Uses Desktop Artwork" : "None (Uses Ambient Gradient)"}
                          </span>
                        )}

                        <label className={styles.fileButton} style={{ alignSelf: "start", marginTop: "4px" }}>
                          <input
                            type="file"
                            name={`banner_mobile_${item.id}`}
                            accept="image/jpeg,image/png,image/webp"
                            disabled={!isReady || !supportsMobileImage || pending}
                            onChange={(event) => chooseMobileArtwork(index, event)}
                          />
                          {effectiveMobileSrc ? "Replace Mobile File" : "Choose Mobile File"}
                        </label>

                        {effectiveMobileSrc ? (
                          <button
                            type="button"
                            className={styles.bannerRemoveLink}
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
    </>
  );
}

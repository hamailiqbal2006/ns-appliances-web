"use client";

import { useActionState, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { HomepageBanner, HomepageSliderSettings } from "@/lib/homepage-banners";
import { saveAllBannerChangesAction } from "../../actions";
import { AdminSwitch } from "../../admin-switch";
import styles from "../../admin.module.css";

type EditorBanner = {
  id: string;
  title: string;
  isEnabled: boolean;
  className: string;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  imagePath: string | null;
  imageUrl: string | null;
  mobileImagePath: string | null;
  mobileImageUrl: string | null;
  sortOrder: number;
  desktopFile: File | null;
  desktopPreviewUrl: string | null;
  desktopDimensions: { width: number; height: number } | null;
  removeDesktopArtwork: boolean;
  mobileFile: File | null;
  mobilePreviewUrl: string | null;
  mobileDimensions: { width: number; height: number } | null;
  removeMobileArtwork: boolean;
};

const AMBIENT_PALETTES = [
  {
    className: "hero-ambient-slide-1",
    palette: {
      primary: "rgba(142, 178, 126, 0.32)",
      secondary: "rgba(68, 138, 125, 0.22)",
      accent: "rgba(225, 238, 200, 0.28)",
    },
  },
  {
    className: "hero-ambient-slide-2",
    palette: {
      primary: "rgba(110, 185, 205, 0.30)",
      secondary: "rgba(42, 115, 130, 0.22)",
      accent: "rgba(195, 235, 245, 0.26)",
    },
  },
  {
    className: "hero-ambient-slide-3",
    palette: {
      primary: "rgba(205, 165, 110, 0.28)",
      secondary: "rgba(125, 95, 60, 0.20)",
      accent: "rgba(245, 225, 185, 0.24)",
    },
  },
];

function prepare(banners: HomepageBanner[]): EditorBanner[] {
  return banners.map((banner, index) => ({
    id: banner.id,
    title: banner.title || `Banner ${index + 1}`,
    isEnabled: banner.isEnabled !== false,
    className: banner.className || AMBIENT_PALETTES[index % AMBIENT_PALETTES.length].className,
    palette: banner.palette || AMBIENT_PALETTES[index % AMBIENT_PALETTES.length].palette,
    imagePath: banner.imagePath,
    imageUrl: banner.imageUrl,
    mobileImagePath: banner.mobileImagePath,
    mobileImageUrl: banner.mobileImageUrl,
    sortOrder: banner.sortOrder ?? index,
    desktopFile: null,
    desktopPreviewUrl: null,
    desktopDimensions: null,
    removeDesktopArtwork: false,
    mobileFile: null,
    mobilePreviewUrl: null,
    mobileDimensions: null,
    removeMobileArtwork: false,
  }));
}

function computeBaselineSnapshot(
  banners: EditorBanner[],
  interval: number,
): string {
  return JSON.stringify({
    interval,
    banners: banners.map((b) => ({
      id: b.id,
      title: b.title.trim(),
      isEnabled: b.isEnabled,
      sortOrder: b.sortOrder,
      imagePath: b.imagePath,
      mobileImagePath: b.mobileImagePath,
    })),
  });
}

export function BannerEditorForm({
  banners,
  isReady,
  supportsMobileImage = true,
  supportsEnabledToggle = true,
  supportsTitle = true,
  sliderSettings = { bannerCount: 3, intervalSeconds: 5 },
  isSettingsReady = true,
}: {
  banners: HomepageBanner[];
  isReady: boolean;
  supportsMobileImage?: boolean;
  supportsEnabledToggle?: boolean;
  supportsTitle?: boolean;
  sliderSettings?: HomepageSliderSettings;
  isSettingsReady?: boolean;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [state, formAction, pending] = useActionState(saveAllBannerChangesAction, { error: null });

  // Baseline items initialized once from server props
  const [items, setItems] = useState<EditorBanner[]>(() => prepare(banners));
  const [intervalType, setIntervalType] = useState<string>(() => {
    const common = [3, 5, 7, 10, 15];
    return common.includes(sliderSettings.intervalSeconds)
      ? String(sliderSettings.intervalSeconds)
      : "custom";
  });
  const [customInterval, setCustomInterval] = useState<number>(sliderSettings.intervalSeconds);

  const initialSnapshot = useMemo(
    () => computeBaselineSnapshot(prepare(banners), sliderSettings.intervalSeconds),
    [banners, sliderSettings.intervalSeconds],
  );

  // Drawer & modal state
  const [editingBannerId, setEditingBannerId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [previewMode, setPreviewMode] = useState<"desktop" | "mobile">("desktop");
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const effectiveInterval = intervalType === "custom" ? customInterval : Number(intervalType);
  const enabledBannerCount = useMemo(() => items.filter((b) => b.isEnabled).length, [items]);

  // Check if current draft differs from baseline
  const isDirty = useMemo(() => {
    const currentSnapshot = computeBaselineSnapshot(items, effectiveInterval);
    const hasPendingFiles = items.some(
      (b) =>
        b.desktopFile !== null ||
        b.mobileFile !== null ||
        b.removeDesktopArtwork ||
        b.removeMobileArtwork,
    );
    return currentSnapshot !== initialSnapshot || hasPendingFiles;
  }, [items, effectiveInterval, initialSnapshot]);

  // Window beforeunload prompt when unsaved changes exist
  useEffect(() => {
    if (!isDirty) return;
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [isDirty]);

  // When save succeeds, refresh server data
  useEffect(() => {
    if (state.success && !pending) {
      router.refresh();
    }
  }, [state.success, pending, router]);

  // Active banner inside the drawer
  const activeDrawerBanner = useMemo(
    () => items.find((b) => b.id === editingBannerId) ?? null,
    [items, editingBannerId],
  );

  // Reordering helpers
  const moveItem = (index: number, direction: -1 | 1) => {
    const dest = index + direction;
    if (dest < 0 || dest >= items.length) return;
    setItems((current) => {
      const next = [...current];
      const temp = next[index];
      next[index] = next[dest];
      next[dest] = temp;
      return next.map((b, i) => ({ ...b, sortOrder: i }));
    });
  };

  // Add new banner (up to 10)
  const handleAddBanner = () => {
    if (items.length >= 10) return;
    const newId = `banner${Date.now().toString(36).replace(/[^a-z]/g, "")}`;
    const newIndex = items.length;
    const ambient = AMBIENT_PALETTES[newIndex % AMBIENT_PALETTES.length];
    const newBanner: EditorBanner = {
      id: newId,
      title: `Banner ${newIndex + 1}`,
      isEnabled: true,
      className: ambient.className,
      palette: ambient.palette,
      imagePath: null,
      imageUrl: null,
      mobileImagePath: null,
      mobileImageUrl: null,
      sortOrder: newIndex,
      desktopFile: null,
      desktopPreviewUrl: null,
      desktopDimensions: null,
      removeDesktopArtwork: false,
      mobileFile: null,
      mobilePreviewUrl: null,
      mobileDimensions: null,
      removeMobileArtwork: false,
    };

    setItems((curr) => [...curr, newBanner]);
    setEditingBannerId(newId);
    setIsDrawerOpen(true);
    setFileError(null);
  };

  // Delete banner (enforces 1 banner minimum)
  const handleDeleteBanner = (id: string) => {
    if (items.length <= 1) return;
    setItems((current) =>
      current
        .filter((b) => b.id !== id)
        .map((b, idx) => ({ ...b, sortOrder: idx })),
    );
    if (editingBannerId === id) {
      setIsDrawerOpen(false);
      setEditingBannerId(null);
    }
    setDeleteConfirmId(null);
  };

  // Choose desktop file for active drawer banner
  const chooseDesktopFile = (bannerId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError(null);
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      event.target.value = "";
      setFileError("Desktop image must be a JPEG, PNG, or WebP file up to 5 MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth < 960 || image.naturalHeight < 540) {
        event.target.value = "";
        URL.revokeObjectURL(previewUrl);
        setFileError("Desktop image must be at least 960 × 540 pixels (recommended: 1920 × 1080).");
        return;
      }
      setItems((current) =>
        current.map((b) =>
          b.id === bannerId
            ? {
                ...b,
                desktopFile: file,
                desktopPreviewUrl: previewUrl,
                desktopDimensions: { width: image.naturalWidth, height: image.naturalHeight },
                removeDesktopArtwork: false,
              }
            : b,
        ),
      );
    };
    image.onerror = () => {
      event.target.value = "";
      URL.revokeObjectURL(previewUrl);
      setFileError("That desktop image could not be read.");
    };
    image.src = previewUrl;
  };

  // Choose mobile file for active drawer banner
  const chooseMobileFile = (bannerId: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError(null);
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      event.target.value = "";
      setFileError("Mobile image must be a JPEG, PNG, or WebP file up to 5 MB.");
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      if (image.naturalWidth < 540 || image.naturalHeight < 540) {
        event.target.value = "";
        URL.revokeObjectURL(previewUrl);
        setFileError("Mobile image must be at least 540 × 540 pixels (recommended: 1080 × 1920).");
        return;
      }
      setItems((current) =>
        current.map((b) =>
          b.id === bannerId
            ? {
                ...b,
                mobileFile: file,
                mobilePreviewUrl: previewUrl,
                mobileDimensions: { width: image.naturalWidth, height: image.naturalHeight },
                removeMobileArtwork: false,
              }
            : b,
        ),
      );
    };
    image.onerror = () => {
      event.target.value = "";
      URL.revokeObjectURL(previewUrl);
      setFileError("That mobile image could not be read.");
    };
    image.src = previewUrl;
  };

  // Form submission: Collects all files and configurations into a single payload
  const handleSaveAll = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setFileError(null);

    const formData = new FormData();
    formData.append("slider_banner_count", String(Math.max(1, Math.min(10, enabledBannerCount))));
    formData.append("slider_interval_seconds", String(effectiveInterval));

    const configPayload = items.map((item, sortOrder) => ({
      slot_key: item.id,
      title: item.title,
      sort_order: sortOrder,
      is_enabled: item.isEnabled,
      remove_desktop_artwork: item.removeDesktopArtwork,
      remove_mobile_artwork: item.removeMobileArtwork,
    }));
    formData.append("banner_configuration", JSON.stringify(configPayload));

    // Append newly selected files
    for (const item of items) {
      if (item.desktopFile) {
        formData.append(`banner_desktop_${item.id}`, item.desktopFile);
      }
      if (item.mobileFile) {
        formData.append(`banner_mobile_${item.id}`, item.mobileFile);
      }
    }

    startTransition(() => {
      formAction(formData);
    });
  };

  return (
    <div className={styles.bannerManagementWrapper}>
      {/* SECTION A — PAGE HEADER */}
      <header className={styles.bannerHeaderBar}>
        <div className={styles.bannerHeaderTitleGroup}>
          <p className={styles.kicker} style={{ margin: 0 }}>Storefront</p>
          <h1>Homepage Banners</h1>
          <p className={styles.bannerHeaderSubtitle}>
            Manage your storefront hero images and rotation settings.
          </p>
        </div>
        <div className={styles.bannerHeaderActions}>
          <span className={styles.bannerCountPill} aria-live="polite">
            {items.length} of 10 banners
          </span>
          <button
            type="button"
            className={styles.addBannerPrimaryBtn}
            onClick={handleAddBanner}
            disabled={items.length >= 10 || pending}
            title={items.length >= 10 ? "Maximum 10 banners allowed" : "Add a new banner slot"}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            Add Banner
          </button>
        </div>
      </header>

      {/* Migration / Schema Warnings */}
      {!isReady ? (
        <div className={styles.noticePanel} style={{ borderLeftColor: "var(--admin-warning)", background: "var(--admin-surface-muted)" }}>
          <strong>Setup Notice:</strong> Apply <code>supabase/migrations/20261029_homepage_banners.sql</code> in your Supabase SQL Editor to enable custom hero banners.
        </div>
      ) : null}

      {!supportsMobileImage ? (
        <div className={styles.noticePanel} style={{ borderLeftColor: "var(--admin-warning)", background: "var(--admin-surface-muted)" }}>
          <strong>Notice:</strong> Apply <code>supabase/migrations/20261106_dual_responsive_banners.sql</code> to enable independent mobile banner artwork.
        </div>
      ) : null}

      {!supportsTitle ? (
        <div className={styles.noticePanel} style={{ borderLeftColor: "var(--admin-primary)", background: "var(--admin-surface-muted)" }}>
          <strong>Feature Notice:</strong> Apply <code>supabase/migrations/20261108_homepage_banner_redesign.sql</code> in your Supabase SQL Editor to persist banner titles and add up to 10 slides.
        </div>
      ) : null}

      {!supportsEnabledToggle ? (
        <div className={styles.noticePanel} style={{ borderLeftColor: "var(--admin-warning)", background: "var(--admin-surface-muted)" }}>
          <strong>Notice:</strong> Apply <code>supabase/migrations/20261106_homepage_slider_settings.sql</code> to support active/inactive toggling.
        </div>
      ) : null}

      {!isSettingsReady ? (
        <div className={styles.noticePanel} style={{ borderLeftColor: "var(--admin-warning)", background: "var(--admin-surface-muted)" }}>
          <strong>Notice:</strong> Apply <code>supabase/migrations/20261106_homepage_slider_settings.sql</code> in your Supabase SQL Editor to persist slider settings.
        </div>
      ) : null}

      {/* SECTION B — ROTATION SETTINGS CARD */}
      <section className={styles.displaySettingsCard} aria-labelledby="display-settings-heading">
        <div className={styles.displaySettingsHeader}>
          <h2 id="display-settings-heading" className={styles.displaySettingsTitle}>
            Rotation Settings
          </h2>
          <p className={styles.displaySettingsSubtitle}>
            Configure slide transition timing for active homepage banners.
          </p>
        </div>

        <div className={styles.displaySettingsGrid}>
          {/* Rotation Interval */}
          <div className={styles.displayField}>
            <label htmlFor="setting-rotation-interval" className={styles.displayLabel}>
              Rotation Interval
            </label>
            <div className={styles.intervalInputGroup}>
              <select
                id="setting-rotation-interval"
                name="interval_preset"
                className={styles.displaySelect}
                value={intervalType}
                onChange={(e) => setIntervalType(e.target.value)}
                disabled={pending || enabledBannerCount <= 1}
              >
                <option value="3">3 seconds</option>
                <option value="5">5 seconds (Recommended)</option>
                <option value="7">7 seconds</option>
                <option value="10">10 seconds</option>
                <option value="15">15 seconds</option>
                <option value="custom">Custom (2–30s)</option>
              </select>

              {intervalType === "custom" && (
                <div style={{ display: "inline-flex", alignItems: "center", position: "relative" }}>
                  <input
                    type="number"
                    min={2}
                    max={30}
                    value={customInterval}
                    onChange={(e) => setCustomInterval(Math.max(2, Math.min(30, Number(e.target.value) || 2)))}
                    className={styles.displaySelect}
                    style={{ width: "80px", paddingRight: "26px" }}
                    aria-label="Custom slide interval in seconds"
                    disabled={pending || enabledBannerCount <= 1}
                  />
                  <span style={{ position: "absolute", right: "8px", fontSize: "12px", color: "var(--admin-text-secondary)", pointerEvents: "none" }}>
                    s
                  </span>
                </div>
              )}
            </div>
            <p className={styles.displayHelper}>
              {enabledBannerCount <= 1
                ? "Auto-rotation is paused while only 1 banner is active in the storefront."
                : `Rotates automatically through all ${enabledBannerCount} active banners every ${effectiveInterval} seconds.`}
            </p>
          </div>
        </div>
      </section>

      {/* SECTION C — BANNER MANAGEMENT LIST */}
      <section className={styles.bannerListCard} aria-labelledby="banner-list-heading">
        <div className={styles.bannerListHeader}>
          <h2 id="banner-list-heading" className={styles.bannerListHeaderTitle}>
            Configured Banners
            <span className={styles.bannerListCountBadge}>{items.length} of 10</span>
          </h2>
          <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)" }}>
            {enabledBannerCount} active in storefront
          </span>
        </div>

        <ul className={styles.bannerListItems} role="list">
          {items.map((item, index) => {
            const effectiveDesktopSrc = item.desktopPreviewUrl || item.imageUrl;
            const effectiveMobileSrc = item.mobilePreviewUrl || item.mobileImageUrl;
            const hasDesktop = Boolean(effectiveDesktopSrc && !item.removeDesktopArtwork);
            const hasMobile = Boolean(effectiveMobileSrc && !item.removeMobileArtwork);

            let assetStatus = "No image";
            if (hasDesktop && hasMobile) assetStatus = "Desktop + Mobile";
            else if (hasDesktop) assetStatus = "Desktop only";
            else if (hasMobile) assetStatus = "Mobile only";

            const isItemDisabled = !item.isEnabled;

            return (
              <li
                key={item.id}
                className={`${styles.bannerListItem} ${isItemDisabled ? styles.bannerListItemDisabled : ""}`}
              >
                {/* Reorder Buttons */}
                <div className={styles.reorderGroup}>
                  <button
                    type="button"
                    className={styles.reorderBtn}
                    onClick={() => moveItem(index, -1)}
                    disabled={index === 0 || pending}
                    aria-label={`Move ${item.title} up`}
                    title="Move up"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="18 15 12 9 6 15" />
                    </svg>
                  </button>
                  <button
                    type="button"
                    className={styles.reorderBtn}
                    onClick={() => moveItem(index, 1)}
                    disabled={index === items.length - 1 || pending}
                    aria-label={`Move ${item.title} down`}
                    title="Move down"
                  >
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                </div>

                {/* Drag Grip Indicator */}
                <div className={styles.dragGrip} title="Rotation position">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="9" cy="6" r="1.5" />
                    <circle cx="15" cy="6" r="1.5" />
                    <circle cx="9" cy="12" r="1.5" />
                    <circle cx="15" cy="12" r="1.5" />
                    <circle cx="9" cy="18" r="1.5" />
                    <circle cx="15" cy="18" r="1.5" />
                  </svg>
                </div>

                {/* Desktop Thumbnail */}
                <div
                  className={styles.bannerListThumb}
                  style={{ background: item.palette.primary }}
                  aria-hidden="true"
                >
                  {effectiveDesktopSrc && !item.removeDesktopArtwork ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img src={effectiveDesktopSrc} alt="" />
                  ) : (
                    <span className={styles.bannerListThumbFallback}>Slide {index + 1}</span>
                  )}
                </div>

                {/* Title and Meta Information */}
                <div className={styles.bannerListInfo}>
                  <div className={styles.bannerListTitleRow}>
                    <h3 className={styles.bannerListTitle}>{item.title}</h3>
                    <span
                      className={`${styles.assetBadge} ${hasDesktop || hasMobile ? styles.assetBadgeActive : ""}`}
                    >
                      {assetStatus}
                    </span>
                  </div>
                  <div className={styles.bannerListMeta}>
                    <span>Position #{index + 1}</span>
                    <span>&middot;</span>
                    <span className={styles.statusPill}>
                      <span className={item.isEnabled ? styles.statusDotActive : styles.statusDotInactive} />
                      {item.isEnabled ? "Active in rotation" : "Inactive / Paused"}
                    </span>
                  </div>
                </div>

                {/* Active in Rotation Accessible Switch */}
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <AdminSwitch
                    checked={item.isEnabled}
                    disabled={pending}
                    onChange={(checked) => {
                      setItems((current) =>
                        current.map((b) => (b.id === item.id ? { ...b, isEnabled: checked } : b)),
                      );
                    }}
                    ariaLabel={`Active rotation for ${item.title || `Banner ${index + 1}`}`}
                  />
                  <span className={styles.statusDotLabel} style={{ fontSize: "12px" }}>
                    {item.isEnabled ? "Active" : "Paused"}
                  </span>
                </div>

                {/* Row Actions: Edit & Delete */}
                <div className={styles.bannerItemActions}>
                  <button
                    type="button"
                    className={styles.editBannerBtn}
                    onClick={() => {
                      setEditingBannerId(item.id);
                      setIsDrawerOpen(true);
                      setFileError(null);
                    }}
                    disabled={pending}
                  >
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                      <path d="m15 5 4 4" />
                    </svg>
                    Edit
                  </button>

                  <button
                    type="button"
                    className={styles.deleteBannerBtn}
                    onClick={() => setDeleteConfirmId(item.id)}
                    disabled={items.length <= 1 || pending}
                    title={items.length <= 1 ? "At least 1 banner must remain" : `Delete ${item.title}`}
                    aria-label={`Delete ${item.title}`}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      {/* SECTION D — ADD / EDIT BANNER SIDE DRAWER */}
      {isDrawerOpen && activeDrawerBanner && (
        <>
          <div
            className={styles.drawerBackdrop}
            onClick={() => {
              setIsDrawerOpen(false);
              setEditingBannerId(null);
            }}
            aria-hidden="true"
          />

          <aside className={styles.drawerPanel} aria-labelledby="drawer-title" role="dialog" aria-modal="true">
            <header className={styles.drawerHeader}>
              <div>
                <h2 id="drawer-title" className={styles.drawerHeaderTitle}>
                  {activeDrawerBanner.title ? `Edit ${activeDrawerBanner.title}` : "Edit Banner"}
                </h2>
                <p className={styles.drawerHeaderSubtitle}>
                  Position #{items.findIndex((b) => b.id === activeDrawerBanner.id) + 1} of {items.length}
                </p>
              </div>
              <button
                type="button"
                className={styles.drawerDoneBtn}
                onClick={() => {
                  setIsDrawerOpen(false);
                  setEditingBannerId(null);
                }}
              >
                Done
              </button>
            </header>

            <div className={styles.drawerBody}>
              {fileError && (
                <div className={styles.noticePanel} style={{ borderLeftColor: "var(--admin-danger)", background: "var(--admin-danger-bg)", color: "var(--admin-danger)" }}>
                  {fileError}
                </div>
              )}

              {/* 1. Banner Name Input */}
              <div className={styles.drawerField}>
                <label htmlFor="drawer-banner-title" className={styles.drawerLabel}>
                  Banner Name
                </label>
                <input
                  id="drawer-banner-title"
                  type="text"
                  className={styles.drawerInput}
                  value={activeDrawerBanner.title}
                  placeholder="e.g., Laundry Made Simple"
                  onChange={(e) => {
                    const nextVal = e.target.value;
                    setItems((curr) =>
                      curr.map((b) => (b.id === activeDrawerBanner.id ? { ...b, title: nextVal } : b)),
                    );
                  }}
                  maxLength={100}
                />
              </div>

              {/* 2. Active in Rotation Switch */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 16px", background: "var(--admin-surface-muted)", borderRadius: "var(--admin-radius-sm)", border: "1px solid var(--admin-border)" }}>
                <div>
                  <span style={{ fontSize: "13.5px", fontWeight: 600, color: "var(--admin-text-primary)", display: "block" }}>Active in Rotation</span>
                  <span style={{ fontSize: "12px", color: "var(--admin-text-secondary)" }}>Include this slide in storefront rotation</span>
                </div>
                <AdminSwitch
                  checked={activeDrawerBanner.isEnabled}
                  onChange={(checked) => {
                    setItems((curr) =>
                      curr.map((b) =>
                        b.id === activeDrawerBanner.id ? { ...b, isEnabled: checked } : b,
                      ),
                    );
                  }}
                  ariaLabel="Include this slide in storefront rotation"
                />
              </div>

              {/* 3. Desktop Image Upload */}
              <div className={styles.uploadSection}>
                <div className={styles.uploadHeader}>
                  <label className={styles.drawerLabel} htmlFor={`drawer-file-desktop-${activeDrawerBanner.id}`}>
                    Desktop Banner Image
                  </label>
                  <span className={styles.uploadSpec}>1920 &times; 1080 (16:9)</span>
                </div>

                {activeDrawerBanner.desktopPreviewUrl || (activeDrawerBanner.imageUrl && !activeDrawerBanner.removeDesktopArtwork) ? (
                  <div className={`${styles.dropzoneBox} ${styles.dropzoneBoxActive}`}>
                    <div className={styles.dropzoneThumbRow}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeDrawerBanner.desktopPreviewUrl || activeDrawerBanner.imageUrl!}
                        alt=""
                        className={styles.dropzonePreviewImg}
                      />
                      <div className={styles.dropzoneDetails}>
                        <span className={styles.dropzoneFileName}>
                          {activeDrawerBanner.desktopFile?.name || "Active desktop artwork"}
                        </span>
                        <span className={styles.dropzoneFileMeta}>
                          {activeDrawerBanner.desktopDimensions
                            ? `${activeDrawerBanner.desktopDimensions.width} × ${activeDrawerBanner.desktopDimensions.height} px`
                            : "Persisted in storage"}
                        </span>
                      </div>
                      <div className={styles.dropzoneActions}>
                        <label className={styles.chooseFileLabel}>
                          Replace
                          <input
                            id={`drawer-file-desktop-${activeDrawerBanner.id}`}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => chooseDesktopFile(activeDrawerBanner.id, e)}
                          />
                        </label>
                        <button
                          type="button"
                          className={styles.removeFileBtn}
                          onClick={() => {
                            setItems((curr) =>
                              curr.map((b) =>
                                b.id === activeDrawerBanner.id
                                  ? {
                                      ...b,
                                      desktopFile: null,
                                      desktopPreviewUrl: null,
                                      desktopDimensions: null,
                                      removeDesktopArtwork: true,
                                    }
                                  : b,
                              ),
                            );
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.dropzoneBox}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect width="18" height="14" x="3" y="5" rx="2" />
                      <circle cx="8.5" cy="10.5" r="1.5" />
                      <path d="m21 15-5-5L5 21" />
                    </svg>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--admin-text-primary)" }}>Upload Desktop Banner</span>
                    <span style={{ fontSize: "11.5px", color: "var(--admin-text-secondary)" }}>JPEG, PNG, or WebP up to 5 MB</span>
                    <label className={styles.chooseFileLabel} style={{ marginTop: "4px" }}>
                      Choose Desktop File
                      <input
                        id={`drawer-file-desktop-${activeDrawerBanner.id}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => chooseDesktopFile(activeDrawerBanner.id, e)}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* 4. Mobile Image Upload */}
              <div className={styles.uploadSection}>
                <div className={styles.uploadHeader}>
                  <label className={styles.drawerLabel} htmlFor={`drawer-file-mobile-${activeDrawerBanner.id}`}>
                    Mobile Banner Image
                  </label>
                  <span className={styles.uploadSpec}>1080 &times; 1920 (9:16)</span>
                </div>

                {activeDrawerBanner.mobilePreviewUrl || (activeDrawerBanner.mobileImageUrl && !activeDrawerBanner.removeMobileArtwork) ? (
                  <div className={`${styles.dropzoneBox} ${styles.dropzoneBoxActive}`}>
                    <div className={styles.dropzoneThumbRow}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={activeDrawerBanner.mobilePreviewUrl || activeDrawerBanner.mobileImageUrl!}
                        alt=""
                        className={styles.dropzonePreviewImg}
                        style={{ width: "40px", height: "60px" }}
                      />
                      <div className={styles.dropzoneDetails}>
                        <span className={styles.dropzoneFileName}>
                          {activeDrawerBanner.mobileFile?.name || "Active mobile artwork"}
                        </span>
                        <span className={styles.dropzoneFileMeta}>
                          {activeDrawerBanner.mobileDimensions
                            ? `${activeDrawerBanner.mobileDimensions.width} × ${activeDrawerBanner.mobileDimensions.height} px`
                            : "Persisted in storage"}
                        </span>
                      </div>
                      <div className={styles.dropzoneActions}>
                        <label className={styles.chooseFileLabel}>
                          Replace
                          <input
                            id={`drawer-file-mobile-${activeDrawerBanner.id}`}
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => chooseMobileFile(activeDrawerBanner.id, e)}
                          />
                        </label>
                        <button
                          type="button"
                          className={styles.removeFileBtn}
                          onClick={() => {
                            setItems((curr) =>
                              curr.map((b) =>
                                b.id === activeDrawerBanner.id
                                  ? {
                                      ...b,
                                      mobileFile: null,
                                      mobilePreviewUrl: null,
                                      mobileDimensions: null,
                                      removeMobileArtwork: true,
                                    }
                                  : b,
                              ),
                            );
                          }}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className={styles.dropzoneBox}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="var(--admin-text-muted)" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <rect width="14" height="20" x="5" y="2" rx="2" />
                      <line x1="12" y1="18" x2="12" y2="18" />
                    </svg>
                    <span style={{ fontSize: "13px", fontWeight: 600, color: "var(--admin-text-primary)" }}>Upload Mobile Banner</span>
                    <span style={{ fontSize: "11.5px", color: "var(--admin-text-secondary)" }}>Optional. Falls back to desktop image if omitted.</span>
                    <label className={styles.chooseFileLabel} style={{ marginTop: "4px" }}>
                      Choose Mobile File
                      <input
                        id={`drawer-file-mobile-${activeDrawerBanner.id}`}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => chooseMobileFile(activeDrawerBanner.id, e)}
                      />
                    </label>
                  </div>
                )}
              </div>

              {/* 5. Interactive Live Preview */}
              <div className={styles.drawerPreviewCard}>
                <div className={styles.drawerPreviewHeader}>
                  <span className={styles.drawerPreviewTitle}>Live Framing Preview</span>
                  <div className={styles.previewToggleSwitch}>
                    <button
                      type="button"
                      className={`${styles.previewSwitchItem} ${previewMode === "desktop" ? styles.previewSwitchItemActive : ""}`}
                      onClick={() => setPreviewMode("desktop")}
                    >
                      Desktop (16:9)
                    </button>
                    <button
                      type="button"
                      className={`${styles.previewSwitchItem} ${previewMode === "mobile" ? styles.previewSwitchItemActive : ""}`}
                      onClick={() => setPreviewMode("mobile")}
                    >
                      Mobile (9:16)
                    </button>
                  </div>
                </div>

                <div
                  className={`${styles.previewStageFrame} ${
                    previewMode === "desktop" ? styles.previewDesktopFrame : styles.previewMobileFrame
                  }`}
                  style={{ background: activeDrawerBanner.palette.primary }}
                >
                  {previewMode === "desktop" ? (
                    activeDrawerBanner.desktopPreviewUrl || (!activeDrawerBanner.removeDesktopArtwork && activeDrawerBanner.imageUrl) ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={activeDrawerBanner.desktopPreviewUrl || activeDrawerBanner.imageUrl!}
                        alt=""
                      />
                    ) : (
                      <span style={{ fontSize: "12px", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                        Ambient Gradient Slide
                      </span>
                    )
                  ) : activeDrawerBanner.mobilePreviewUrl || (!activeDrawerBanner.removeMobileArtwork && activeDrawerBanner.mobileImageUrl) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={activeDrawerBanner.mobilePreviewUrl || activeDrawerBanner.mobileImageUrl!}
                      alt=""
                    />
                  ) : activeDrawerBanner.desktopPreviewUrl || (!activeDrawerBanner.removeDesktopArtwork && activeDrawerBanner.imageUrl) ? (
                    /* eslint-disable-next-line @next/next/no-img-element */
                    <img
                      src={activeDrawerBanner.desktopPreviewUrl || activeDrawerBanner.imageUrl!}
                      alt=""
                    />
                  ) : (
                    <span style={{ fontSize: "11px", color: "rgba(255,255,255,0.7)", fontWeight: 600 }}>
                      Ambient Gradient
                    </span>
                  )}

                  {/* Top navbar clearance guide */}
                  <div className={styles.previewSafeGuideTop}>
                    <span>Navbar Clearance Area</span>
                  </div>
                </div>
              </div>
            </div>

            <footer style={{ padding: "16px 24px", borderTop: "1px solid var(--admin-border)", display: "flex", justifyContent: "flex-end" }}>
              <button
                type="button"
                className={styles.drawerDoneBtn}
                onClick={() => {
                  setIsDrawerOpen(false);
                  setEditingBannerId(null);
                }}
              >
                Done
              </button>
            </footer>
          </aside>
        </>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className={styles.modalBackdrop} role="dialog" aria-modal="true">
          <div className={styles.modalCard}>
            <h3 className={styles.modalTitle}>Delete Banner</h3>
            <p className={styles.modalDescription}>
              Are you sure you want to delete this banner slot? This change will be applied once you click &ldquo;Save All Changes&rdquo;.
            </p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className={styles.buttonSecondary}
                onClick={() => setDeleteConfirmId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.bulkDangerButton}
                onClick={() => handleDeleteBanner(deleteConfirmId)}
              >
                Delete Banner
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SECTION E — SINGLE PRIMARY SAVE ACTION BAR (FORM) */}
      <form onSubmit={handleSaveAll} className={styles.singleSaveBar}>
        <div className={styles.saveBarStatus}>
          {isDirty ? (
            <span className={styles.unsavedBadge}>
              <span className={styles.unsavedDot} />
              Unsaved changes
            </span>
          ) : (
            <span className={styles.savedBadge}>
              <span className={styles.savedDot} />
              All changes saved
            </span>
          )}

          {state.error && (
            <span style={{ color: "#dc2626", fontSize: "12.5px", fontWeight: 500, marginLeft: "12px" }}>
              &bull; {state.error}
            </span>
          )}
          {state.success && !isDirty && (
            <span style={{ color: "#15803d", fontSize: "12.5px", fontWeight: 500, marginLeft: "12px" }}>
              &bull; Homepage banners saved successfully!
            </span>
          )}
        </div>

        <button
          type="submit"
          className={styles.saveAllPrimaryBtn}
          disabled={!isDirty || pending}
        >
          {pending ? (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={styles.spinning} aria-hidden="true" style={{ animation: "spin 1s linear infinite" }}>
                <circle cx="12" cy="12" r="10" strokeOpacity="0.25" />
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
              Saving All Changes...
            </>
          ) : (
            "Save All Changes"
          )}
        </button>
      </form>
    </div>
  );
}

/* eslint-disable @next/next/no-img-element -- previews use browser object URLs and the app's private media stream. */
"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { HomepageBanner } from "@/lib/homepage-banners";
import { saveHomepageBannersAction } from "../../actions";
import styles from "../../admin.module.css";

type EditorBanner = HomepageBanner & { previewUrl: string | null; removeArtwork: boolean };

const prepare = (banners: HomepageBanner[]): EditorBanner[] =>
  banners.map((banner) => ({
    ...banner,
    previewUrl: banner.imageUrl,
    removeArtwork: false,
  }));

export function BannerEditorForm({
  banners,
  isReady,
}: {
  banners: HomepageBanner[];
  isReady: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveHomepageBannersAction, { error: null });
  const [items, setItems] = useState<EditorBanner[]>(() => prepare(banners));
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  const configuration = useMemo(
    () =>
      JSON.stringify(
        items.map((item, sort_order) => ({
          slot_key: item.id,
          sort_order,
          remove_artwork: item.removeArtwork,
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

  const chooseArtwork = (index: number, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError(null);
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      event.target.value = "";
      setFileError("Use a JPEG, PNG, or WebP image up to 5 MB.");
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
        setFileError("Banner images must be between 960 × 540 and 6000 × 6000 pixels.");
        return;
      }
      setItems((current) =>
        current.map((item, itemIndex) =>
          itemIndex === index ? { ...item, previewUrl, removeArtwork: false } : item,
        ),
      );
    };
    image.onerror = () => {
      event.target.value = "";
      URL.revokeObjectURL(previewUrl);
      setFileError("That file could not be read as an image.");
    };
    image.src = previewUrl;
  };

  return (
    <form className={styles.editorForm} action={formAction} noValidate>
      <fieldset>
        <legend>Approved Rotating Hero Slots (3 ambient slides)</legend>

        {!isReady ? (
          <div className={styles.setupNotice} style={{ marginTop: "16px" }}>
            Banner changes are safely blocked until <code>supabase/migrations/20261029_homepage_banners.sql</code> is applied. The public storefront uses its default ambient fallback.
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

            return (
              <section className={styles.bannerEditorCard} key={item.id}>
                <div className={styles.bannerPreviewRow}>
                  <div
                    className={styles.bannerDesktopPreview}
                    style={{ background: item.palette.primary }}
                    aria-label={`Desktop preview for ${slotTitle}`}
                  >
                    {item.previewUrl && !item.removeArtwork ? <img src={item.previewUrl} alt="" /> : null}
                    <span>Desktop (16:9)</span>
                  </div>
                  <div
                    className={styles.bannerMobilePreview}
                    style={{ background: item.palette.primary }}
                    aria-label={`Mobile preview for ${slotTitle}`}
                  >
                    {item.previewUrl && !item.removeArtwork ? <img src={item.previewUrl} alt="" /> : null}
                    <span>Mobile</span>
                  </div>
                </div>

                <div className={styles.bannerEditorDetails}>
                  <p className={styles.kicker}>Rotation Position {index + 1} of 3</p>
                  <h2>{slotTitle}</h2>
                  <p>
                    JPEG, PNG, or WebP; 960 × 540 to 6000 × 6000 px; 5 MB maximum.
                  </p>

                  <label className={styles.bannerFileLabel}>
                    <span style={{ fontSize: "12px", fontWeight: 600, color: "#2d3a37" }}>
                      Upload / Replace Artwork
                    </span>
                    <input
                      name={`banner_${item.id}`}
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={!isReady || pending}
                      onChange={(event) => chooseArtwork(index, event)}
                    />
                  </label>

                  {item.imagePath && !item.removeArtwork ? (
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      style={{ minHeight: "32px", padding: "4px 10px", fontSize: "12px", alignSelf: "start" }}
                      disabled={!isReady || pending}
                      onClick={() =>
                        setItems((current) =>
                          current.map((entry, itemIndex) =>
                            itemIndex === index
                              ? { ...entry, removeArtwork: true, previewUrl: null }
                              : entry,
                          ),
                        )
                      }
                    >
                      Remove custom artwork
                    </button>
                  ) : null}

                  {item.removeArtwork ? (
                    <p className={styles.fieldHelp} style={{ color: "#b45309" }}>
                      Artwork will be removed after saving; the default ambient background remains in place.
                    </p>
                  ) : null}

                  <div className={styles.bannerOrderControls}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      style={{ minHeight: "32px", padding: "4px 10px", fontSize: "12px" }}
                      disabled={!isReady || pending || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      ↑ Move earlier
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      style={{ minHeight: "32px", padding: "4px 10px", fontSize: "12px" }}
                      disabled={!isReady || pending || index === items.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      ↓ Move later
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

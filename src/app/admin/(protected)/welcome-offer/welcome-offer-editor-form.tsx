/* eslint-disable @next/next/no-img-element -- the editor previews a local object URL or a protected app media URL. */
"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { WelcomePopupAdminConfig } from "@/lib/welcome-popup-data";
import { saveWelcomePopupAction } from "../../actions";
import styles from "../../admin.module.css";

export function WelcomeOfferEditorForm({ config }: { config: WelcomePopupAdminConfig }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, formAction, pending] = useActionState(saveWelcomePopupAction, { error: null });

  const [enabled, setEnabled] = useState(config.enabled);
  const [displayDelay, setDisplayDelay] = useState(String(config.displayDelaySeconds));
  const [eyebrow, setEyebrow] = useState(config.eyebrow);
  const [headline, setHeadline] = useState(config.headline);
  const [description, setDescription] = useState(config.description);
  const [offerText, setOfferText] = useState(config.offerText ?? "");
  const [buttonLabel, setButtonLabel] = useState(config.buttonLabel);
  const [imageAlt, setImageAlt] = useState(config.imageAlt);
  const [previewUrl, setPreviewUrl] = useState<string | undefined>(config.imageSrc);
  const [removeImage, setRemoveImage] = useState(false);
  const [fileError, setFileError] = useState<string | null>(null);

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  const chooseImage = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setFileError(null);
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) {
      event.target.value = "";
      setFileError("Use a JPEG, PNG, or WebP image up to 5 MB.");
      return;
    }
    const nextUrl = URL.createObjectURL(file);
    setPreviewUrl(nextUrl);
    setRemoveImage(false);
  };

  return (
    <form className={styles.twoColFormLayout} action={formAction} noValidate>
      {/* Left Column: Configuration Controls */}
      <div className={styles.editorMainColumn}>
        <div className={styles.editorForm}>
          {/* Section 1: Display & Timing */}
          <fieldset>
            <legend>Display &amp; Timing</legend>

            <div>
              <label className={styles.publishToggle}>
                <input
                  name="enabled"
                  type="checkbox"
                  checked={enabled}
                  disabled={!config.isReady || pending}
                  onChange={(event) => setEnabled(event.target.checked)}
                />
                <span>
                  <strong style={{ display: "block", color: "#141c1b", marginBottom: "2px" }}>
                    Show welcome popup
                  </strong>
                  <span style={{ color: "#566461", fontSize: "12.5px" }}>
                    Enable to display the invitation modal to visitors on the storefront.
                  </span>
                </span>
              </label>
            </div>

            <div className={styles.settingsControlRow}>
              <div className={styles.settingsControlLabelGroup}>
                <label htmlFor="display_delay_seconds" className={styles.settingsControlTitle}>
                  Appearance Delay
                </label>
                <p className={styles.settingsControlDescription}>
                  Seconds before the welcome modal appears to visitors.
                </p>
              </div>
              <div className={styles.settingsControlAffixGroup}>
                <input
                  id="display_delay_seconds"
                  name="display_delay_seconds"
                  type="number"
                  min="0"
                  max="600"
                  value={displayDelay}
                  onChange={(e) => setDisplayDelay(e.target.value)}
                  disabled={!config.isReady || pending}
                  required
                  className={styles.settingsControlCompactInput}
                  aria-label="Appearance delay in seconds"
                />
                <span className={styles.settingsControlUnit}>seconds</span>
              </div>
            </div>
          </fieldset>

          {/* Section 2: Copy & Content */}
          <fieldset>
            <legend>Content &amp; Messaging</legend>

            <div className={styles.fieldGrid}>
              <label className={styles.fieldWide}>
                Eyebrow Kicker
                <input
                  name="eyebrow"
                  value={eyebrow}
                  onChange={(e) => setEyebrow(e.target.value)}
                  maxLength={60}
                  disabled={!config.isReady || pending}
                  placeholder="e.g. NS HOME APPLIANCES"
                  required
                />
              </label>

              <label className={styles.fieldWide}>
                Headline
                <input
                  name="headline"
                  value={headline}
                  onChange={(e) => setHeadline(e.target.value)}
                  maxLength={90}
                  disabled={!config.isReady || pending}
                  placeholder="e.g. Discover showroom appliances."
                  required
                />
              </label>

              <label className={styles.fieldWide}>
                Description
                <textarea
                  name="description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  maxLength={280}
                  rows={3}
                  disabled={!config.isReady || pending}
                  placeholder="e.g. Enter your WhatsApp number to receive curated showroom updates and promotions."
                  required
                />
              </label>

              <label className={styles.fieldWide}>
                Offer Text (Optional)
                <textarea
                  name="offer_text"
                  value={offerText}
                  onChange={(e) => setOfferText(e.target.value)}
                  maxLength={180}
                  rows={2}
                  disabled={!config.isReady || pending}
                  placeholder="e.g. Receive 5% priority voucher on your next showroom visit"
                />
              </label>

              <label className={styles.fieldWide}>
                Button Label (Accessibility)
                <input
                  name="button_label"
                  value={buttonLabel}
                  onChange={(e) => setButtonLabel(e.target.value)}
                  maxLength={50}
                  disabled={!config.isReady || pending}
                  placeholder="e.g. Subscribe to showroom updates"
                  required
                />
              </label>
            </div>
          </fieldset>

          {/* Section 3: Appliance Image */}
          <fieldset>
            <legend>Appliance Photograph</legend>

            <div className={styles.styledUploadArea}>
              {previewUrl && !removeImage ? (
                <img
                  className={styles.styledUploadThumb}
                  src={previewUrl}
                  alt="Welcome popup cutout preview"
                />
              ) : (
                <div className={styles.styledUploadPlaceholder}>
                  No image selected
                </div>
              )}

              <div className={styles.styledUploadControls}>
                <div style={{ display: "flex", gap: "10px", alignItems: "center" }}>
                  <button
                    type="button"
                    className={styles.uploadFileBtn}
                    disabled={!config.isReady || pending}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                    Choose new image
                  </button>

                  <input
                    ref={fileInputRef}
                    name="image"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    disabled={!config.isReady || pending}
                    onChange={chooseImage}
                    style={{ display: "none" }}
                  />
                </div>

                <span style={{ fontSize: "11.5px", color: "#63736f" }}>
                  JPEG, PNG, or WebP · Maximum 5 MB
                </span>

                {config.imagePath && !removeImage && (
                  <label className={styles.inlineDelete} style={{ marginTop: "4px" }}>
                    <input
                      name="remove_image"
                      type="checkbox"
                      checked={removeImage}
                      disabled={!config.isReady || pending}
                      onChange={(event) => {
                        setRemoveImage(event.target.checked);
                        if (event.target.checked) setPreviewUrl(undefined);
                      }}
                    />{" "}
                    Remove current image
                  </label>
                )}
              </div>
            </div>

            {fileError ? (
              <p className={styles.formError} role="alert" style={{ marginTop: "10px" }}>
                {fileError}
              </p>
            ) : null}

            <div className={styles.fieldGrid} style={{ marginTop: "16px" }}>
              <label className={styles.fieldWide}>
                Image Alt Text
                <input
                  name="image_alt"
                  value={imageAlt}
                  onChange={(e) => setImageAlt(e.target.value)}
                  maxLength={160}
                  disabled={!config.isReady || pending}
                  placeholder="e.g. Front-load washing machine appliance cutout"
                  required
                />
              </label>
            </div>
          </fieldset>
        </div>
      </div>

      {/* Right Column: Sticky Live Preview & Save Actions */}
      <div className={styles.editorStickyPanel}>
        {/* Live Interactive Popup Preview Card */}
        <div className={styles.popupPreviewCard}>
          <div className={styles.popupPreviewHeader}>
            <strong>Live Storefront Popup Preview</strong>
            <span>Updates as you type</span>
          </div>

          <div className={styles.popupStageBox}>
            <div className={styles.popupMiniStage}>
              {/* Left Stage */}
              <div className={styles.popupMiniVisual}>
                <span className={styles.popupMiniWatermark}>NS</span>
                {previewUrl && !removeImage ? (
                  <img src={previewUrl} alt={imageAlt || "Live appliance cutout"} />
                ) : (
                  <div style={{ color: "#5a6b66", fontSize: "11px", textAlign: "center" }}>
                    No appliance image
                  </div>
                )}
              </div>

              {/* Right Content */}
              <div className={styles.popupMiniContent}>
                <p className={styles.popupMiniEyebrow}>{eyebrow || "NS Home Appliances"}</p>
                <h4 className={styles.popupMiniHeadline}>{headline || "Discover showroom appliances."}</h4>
                <p className={styles.popupMiniDesc}>
                  {description || "Enter your WhatsApp number to receive curated showroom updates."}
                </p>
                {offerText ? <p className={styles.popupMiniOffer}>{offerText}</p> : null}

                <div className={styles.popupMiniInputRow}>
                  <span className={styles.popupMiniPrefix}>+92</span>
                  <div className={styles.popupMiniInputFake}>300 1234567</div>
                  <div className={styles.popupMiniButtonFake}>
                    <svg viewBox="0 0 24 24">
                      <path d="M5 12h13M13 6l6 6-6 6" />
                    </svg>
                  </div>
                </div>

                <div style={{ display: "flex", gap: "6px", alignItems: "center", marginTop: "8px" }}>
                  <span style={{ width: "9px", height: "9px", borderRadius: "2px", border: "1px solid #798a85", display: "inline-block" }} />
                  <span style={{ fontSize: "8.5px", color: "#8da09a" }}>Opt in for WhatsApp updates</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Action & Status Card */}
        <div className={styles.settingsSummaryCard} style={{ padding: "18px 20px" }}>
          <div className={styles.summaryHeader}>
            <h3>Rollout Status</h3>
            <span
              className={styles.status}
              data-status={enabled ? "active" : "archived"}
              style={{ fontSize: "10.5px" }}
            >
              {enabled ? "Active on Site" : "Disabled"}
            </span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Display Delay</span>
            <span className={styles.summaryValue}>{displayDelay || 0} seconds</span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Showcase Image</span>
            <span className={styles.summaryValue}>
              {previewUrl && !removeImage ? "Connected" : "Not configured"}
            </span>
          </div>

          <div style={{ marginTop: "16px" }}>
            {state.error ? (
              <p className={styles.formError} role="alert" style={{ margin: "0 0 12px" }}>
                {state.error}
              </p>
            ) : null}

            {state.success ? (
              <p className={styles.formSuccess} role="status" style={{ margin: "0 0 12px" }}>
                Welcome offer saved. Public settings have been refreshed.
              </p>
            ) : null}

            <button
              className={styles.primaryButton}
              type="submit"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={!config.isReady || pending}
            >
              {pending ? "Saving welcome offer…" : "Save welcome offer"}
            </button>
          </div>
        </div>
      </div>
    </form>
  );
}

"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type {
  AnnouncementMessage,
  AnnouncementSeparator,
  AnnouncementSpeed,
  AnnouncementTheme,
} from "@/lib/announcement-bar";
import { AnnouncementBarView, SeparatorGlyph } from "@/components/announcement-bar";
import { saveAnnouncementBarAction } from "../../actions";
import { AdminSwitch } from "../../admin-switch";
import styles from "../../admin.module.css";

type EditorMessage = AnnouncementMessage & { clientId: string };

function prepare(messages: AnnouncementMessage[]): EditorMessage[] {
  return messages.map((message) => ({ ...message, clientId: message.id || crypto.randomUUID() }));
}

const CURATED_THEME_OPTIONS: Array<{
  id: AnnouncementTheme;
  label: string;
  subtitle: string;
  swatchClass: string;
}> = [
  { id: "charcoal-graphite", label: "Classic Dark", subtitle: "Charcoal → Graphite", swatchClass: styles.swatchCharcoal },
  { id: "warm-beige-stone", label: "Soft Light", subtitle: "Warm Beige → Stone", swatchClass: styles.swatchBeige },
  { id: "emerald-green", label: "Brand Green", subtitle: "Emerald → Forest", swatchClass: styles.swatchEmeraldGreen },
  { id: "deep-navy-teal", label: "Deep Navy", subtitle: "Navy → Teal", swatchClass: styles.swatchNavy },
  { id: "dark-olive-charcoal", label: "Warm Stone", subtitle: "Dark Olive → Charcoal", swatchClass: styles.swatchOlive },
];

const LEGACY_THEME_OPTIONS: Array<{
  id: AnnouncementTheme;
  label: string;
  swatchClass: string;
}> = [
  { id: "ruby-red", label: "Ruby Red", swatchClass: styles.swatchRubyRed },
  { id: "crimson-sunset", label: "Crimson Sunset", swatchClass: styles.swatchCrimsonSunset },
  { id: "golden-yellow", label: "Golden Yellow", swatchClass: styles.swatchGoldenYellow },
  { id: "sunset-orange", label: "Sunset Orange", swatchClass: styles.swatchSunsetOrange },
  { id: "rose-pink", label: "Rose Pink", swatchClass: styles.swatchRosePink },
  { id: "royal-purple", label: "Royal Purple", swatchClass: styles.swatchRoyalPurple },
  { id: "electric-blue", label: "Electric Blue", swatchClass: styles.swatchElectricBlue },
  { id: "ocean-cyan", label: "Ocean Cyan", swatchClass: styles.swatchOceanCyan },
  { id: "lime-energy", label: "Lime Energy", swatchClass: styles.swatchLimeEnergy },
  { id: "berry-fusion", label: "Berry Fusion", swatchClass: styles.swatchBerryFusion },
  { id: "festival-gradient", label: "Festival Gradient", swatchClass: styles.swatchFestivalGradient },
  { id: "soft-black-blue", label: "Soft Black → Blue", swatchClass: styles.swatchObsidian },
];

const THEME_OPTIONS = [...CURATED_THEME_OPTIONS, ...LEGACY_THEME_OPTIONS];

const SEPARATOR_OPTIONS: Array<{
  id: AnnouncementSeparator;
  label: string;
}> = [
  { id: "dot", label: "Micro Dot" },
  { id: "diamond", label: "Diamond" },
  { id: "star", label: "Luxury Star" },
  { id: "slash", label: "Line Glyph" },
];

const SPEED_OPTIONS: Array<{
  id: AnnouncementSpeed;
  label: string;
  detail: string;
}> = [
  { id: "slow", label: "Slow", detail: "44s loop • Calm" },
  { id: "normal", label: "Normal", detail: "28s loop • Balanced" },
  { id: "fast", label: "Fast", detail: "18s loop • Dynamic" },
];

export function AnnouncementBarEditorForm({
  enabled,
  theme = "charcoal-graphite",
  separator = "dot",
  speed = "normal",
  messages,
  isReady,
  hasCustomizationColumns,
}: {
  enabled: boolean;
  theme?: AnnouncementTheme;
  separator?: AnnouncementSeparator;
  speed?: AnnouncementSpeed;
  messages: AnnouncementMessage[];
  isReady: boolean;
  hasCustomizationColumns?: boolean;
}) {
  const router = useRouter();
  const [state, formAction, pending] = useActionState(saveAnnouncementBarAction, { error: null });

  const [isEnabled, setIsEnabled] = useState(enabled);
  const [selectedTheme, setSelectedTheme] = useState<AnnouncementTheme>(theme);
  const [selectedSeparator, setSelectedSeparator] = useState<AnnouncementSeparator>(separator);
  const [selectedSpeed, setSelectedSpeed] = useState<AnnouncementSpeed>(speed);
  const [items, setItems] = useState<EditorMessage[]>(() => prepare(messages));

  useEffect(() => {
    if (state.success) router.refresh();
  }, [router, state.success]);

  const configuration = useMemo(
    () =>
      JSON.stringify(
        items.map((item, sort_order) => ({
          id: item.id || null,
          message: item.message,
          is_active: item.isActive,
          sort_order,
        })),
      ),
    [items],
  );

  const update = (clientId: string, change: Partial<EditorMessage>) =>
    setItems((current) =>
      current.map((item) => (item.clientId === clientId ? { ...item, ...change } : item)),
    );

  const move = (index: number, direction: -1 | 1) =>
    setItems((current) => {
      const destination = index + direction;
      if (destination < 0 || destination >= current.length) return current;
      const next = [...current];
      [next[index], next[destination]] = [next[destination], next[index]];
      return next;
    });

  const add = () =>
    setItems((current) =>
      current.length >= 50
        ? current
        : [
            ...current,
            {
              id: "",
              clientId: crypto.randomUUID(),
              message: "",
              isActive: true,
              sortOrder: current.length,
            },
          ],
    );

  const remove = (clientId: string) =>
    setItems((current) => current.filter((entry) => entry.clientId !== clientId));

  const activeThemeObj = THEME_OPTIONS.find((t) => t.id === selectedTheme) ?? THEME_OPTIONS[12];
  const activeSepObj = SEPARATOR_OPTIONS.find((s) => s.id === selectedSeparator) ?? SEPARATOR_OPTIONS[0];
  const activeSpeedObj = SPEED_OPTIONS.find((s) => s.id === selectedSpeed) ?? SPEED_OPTIONS[1];

  return (
    <form className={styles.twoColFormLayout} action={formAction} noValidate>
      {/* Hidden serialization inputs */}
      <input type="hidden" name="announcement_configuration" value={configuration} />
      <input type="hidden" name="announcement_bar_theme" value={selectedTheme} />
      <input type="hidden" name="announcement_bar_separator" value={selectedSeparator} />
      <input type="hidden" name="announcement_bar_speed" value={selectedSpeed} />

      {/* Left Column: Settings & Content (60-65%) */}
      <div className={styles.editorMainColumn}>
        <div className={styles.editorForm}>
          {/* Section 1: Activation */}
          <fieldset>
            <legend>Homepage Announcement Bar</legend>

            {!isReady && (
              <div className={styles.setupNotice}>
                Announcement changes are safely blocked until{" "}
                <code>supabase/migrations/20261029_announcement_bar.sql</code> is applied in Supabase.
              </div>
            )}

            {isReady && !hasCustomizationColumns && (
              <div className={styles.setupNotice} role="alert">
                <strong>⚠️ Database Migration Required to Save Customizations:</strong>
                <p style={{ margin: "6px 0 0" }}>
                  The table <code>announcement_bar_settings</code> is missing <code>theme</code>, <code>separator</code>, and <code>speed</code>.
                  Run <code>supabase/migrations/20261029_announcement_bar_customization.sql</code> in Supabase SQL Editor.
                  Interactive preview works immediately.
                </p>
              </div>
            )}

            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: "14px",
                padding: "14px 16px",
                marginTop: "16px",
                border: "1px solid var(--admin-border)",
                borderRadius: "var(--admin-radius-sm)",
                backgroundColor: "var(--admin-surface-muted)",
              }}
            >
              <input type="hidden" name="announcement_bar_enabled" value={isEnabled ? "true" : "false"} />
              <div>
                <strong style={{ display: "block", color: "var(--admin-text-primary)", fontSize: "13.5px" }}>
                  {isEnabled ? "Announcement Bar Active" : "Announcement Bar Hidden"}
                </strong>
                <span style={{ display: "block", marginTop: "3px", color: "var(--admin-text-secondary)", fontSize: "12px", lineHeight: 1.45 }}>
                  Turn off to hide the announcement strip from public visitors without losing saved messages.
                </span>
              </div>
              <AdminSwitch
                checked={isEnabled}
                disabled={!isReady || pending}
                onChange={setIsEnabled}
                ariaLabel="Show announcement bar on storefront"
              />
            </div>
          </fieldset>

          {/* Section 2: Messages */}
          <fieldset>
            <legend>Announcement Messages</legend>

            <div className={styles.announcementEditorList} style={{ marginTop: "16px" }}>
              {items.map((item, index) => (
                <section className={styles.announcementEditorCard} key={item.clientId}>
                  <label>
                    Message
                    <input
                      value={item.message}
                      maxLength={120}
                      disabled={!isReady || pending}
                      onChange={(event) => update(item.clientId, { message: event.target.value })}
                      placeholder="e.g. Complimentary White-Glove Installation on Select Ranges"
                    />
                  </label>

                  <div className={styles.announcementMeta}>
                    <span>{item.message.length}/120</span>
                    <label className={styles.inlineToggle}>
                      <input
                        type="checkbox"
                        checked={item.isActive}
                        disabled={!isReady || pending}
                        onChange={(event) => update(item.clientId, { isActive: event.target.checked })}
                      />{" "}
                      Active
                    </label>
                  </div>

                  <div className={styles.announcementOrderControls}>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled={!isReady || pending || index === 0}
                      onClick={() => move(index, -1)}
                    >
                      Move earlier
                    </button>
                    <button
                      type="button"
                      className={styles.secondaryButton}
                      disabled={!isReady || pending || index === items.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      Move later
                    </button>
                    <button
                      type="button"
                      className={styles.dangerButton}
                      disabled={!isReady || pending}
                      onClick={() => remove(item.clientId)}
                    >
                      Remove
                    </button>
                  </div>
                </section>
              ))}
            </div>

            <div className={styles.announcementAddRow} style={{ marginTop: "14px" }}>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={!isReady || pending || items.length >= 50}
                onClick={add}
              >
                + Add message
              </button>
            </div>
          </fieldset>

          {/* Section 3: Curated 5 Color Themes + Expandable Accordion */}
          <fieldset>
            <legend>Color Theme Preset</legend>

            <p style={{ margin: "4px 0 14px", fontSize: "12.5px", color: "var(--admin-text-secondary)" }}>
              Select a curated presentation theme designed for high contrast and storefront balance.
            </p>

            <div className={styles.curatedThemeGrid}>
              {CURATED_THEME_OPTIONS.map((opt) => {
                const isChecked = selectedTheme === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={`${styles.curatedThemeCard} ${isChecked ? styles.curatedThemeCardChecked : ""}`}
                  >
                    <input
                      type="radio"
                      name="theme_choice"
                      value={opt.id}
                      checked={isChecked}
                      disabled={!isReady || pending}
                      onChange={() => setSelectedTheme(opt.id)}
                    />
                    <span className={`${styles.curatedThemeSwatch} ${opt.swatchClass}`} />
                    <div className={styles.curatedThemeText}>
                      <strong className={styles.curatedThemeName}>{opt.label}</strong>
                      <span className={styles.curatedThemeDesc}>{opt.subtitle}</span>
                    </div>
                  </label>
                );
              })}
            </div>

            <details className={styles.legacyThemesAccordion} style={{ marginTop: "16px" }}>
              <summary className={styles.legacyThemesSummary}>
                More color presets (12 additional themes)
              </summary>
              <div className={styles.compactThemeGrid} style={{ marginTop: "12px" }}>
                {LEGACY_THEME_OPTIONS.map((opt) => {
                  const isChecked = selectedTheme === opt.id;
                  return (
                    <label
                      key={opt.id}
                      className={`${styles.compactThemeCard} ${isChecked ? styles.compactThemeCardChecked : ""}`}
                    >
                      <input
                        type="radio"
                        name="theme_choice"
                        value={opt.id}
                        checked={isChecked}
                        disabled={!isReady || pending}
                        onChange={() => setSelectedTheme(opt.id)}
                      />
                      <span className={`${styles.compactThemeMiniSwatch} ${opt.swatchClass}`} />
                      <span>{opt.label}</span>
                    </label>
                  );
                })}
              </div>
            </details>
          </fieldset>

          {/* Section 4: Separator & Motion Speed */}
          <fieldset>
            <legend>Separator &amp; Motion Speed</legend>

            <div style={{ marginTop: "16px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 650, color: "var(--admin-text-primary)", display: "block", marginBottom: "8px" }}>
                Separator Glyph
              </span>
              <div className={styles.separatorOptionGrid}>
                {SEPARATOR_OPTIONS.map((sep) => {
                  const isChecked = selectedSeparator === sep.id;
                  return (
                    <label
                      key={sep.id}
                      className={`${styles.separatorCard} ${isChecked ? styles.separatorCardChecked : ""}`}
                    >
                      <input
                        type="radio"
                        name="separator_choice"
                        value={sep.id}
                        checked={isChecked}
                        disabled={!isReady || pending}
                        onChange={() => setSelectedSeparator(sep.id)}
                      />
                      <SeparatorGlyph separator={sep.id} />
                      <span>{sep.label}</span>
                    </label>
                  );
                })}
              </div>
            </div>

            <div style={{ marginTop: "20px" }}>
              <span style={{ fontSize: "12.5px", fontWeight: 650, color: "var(--admin-text-primary)", display: "block", marginBottom: "8px" }}>
                Scroll Speed
              </span>
              <div className={styles.speedOptionGrid}>
                {SPEED_OPTIONS.map((spd) => {
                  const isChecked = selectedSpeed === spd.id;
                  return (
                    <label
                      key={spd.id}
                      className={`${styles.separatorCard} ${isChecked ? styles.separatorCardChecked : ""}`}
                    >
                      <input
                        type="radio"
                        name="speed_choice"
                        value={spd.id}
                        checked={isChecked}
                        disabled={!isReady || pending}
                        onChange={() => setSelectedSpeed(spd.id)}
                      />
                      <span>
                        <strong>{spd.label}</strong>
                        <br />
                        <small style={{ color: "var(--admin-text-secondary)" }}>{spd.detail}</small>
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </fieldset>
        </div>
      </div>

      {/* Right Column: Sticky Live Preview & Action Card (35-40%) */}
      <div className={styles.editorStickyPanel}>
        {/* Live Interactive Preview Box */}
        <div className={styles.announcementPreview} aria-label="Live announcement bar preview">
          <div className={styles.previewMetaRow}>
            <span className={styles.previewLabel}>Interactive live preview</span>
            <span className={styles.previewNote}>Hover to pause motion</span>
          </div>

          <AnnouncementBarView
            enabled={isEnabled}
            messages={items}
            theme={selectedTheme}
            separator={selectedSeparator}
            speed={selectedSpeed}
            previewMode={true}
          />
        </div>

        {/* Consolidated Configuration & Save Card */}
        <div className={styles.settingsSummaryCard} style={{ padding: "18px 20px" }}>
          <div className={styles.summaryHeader}>
            <h3>Configuration Summary</h3>
            <span className={styles.statusDotLabel}>
              <span className={`${styles.statusDot} ${isEnabled ? styles.statusDotActive : styles.statusDotDraft}`} aria-hidden />
              {isEnabled ? "Enabled" : "Disabled"}
            </span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Theme Preset</span>
            <span className={styles.summaryValue}>
              <span
                className={`${styles.compactThemeMiniSwatch} ${activeThemeObj.swatchClass}`}
                style={{ width: "12px", height: "12px" }}
              />
              {activeThemeObj.label}
            </span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Separator</span>
            <span className={styles.summaryValue}>
              <SeparatorGlyph separator={selectedSeparator} /> {activeSepObj.label}
            </span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Motion Speed</span>
            <span className={styles.summaryValue}>{activeSpeedObj.label}</span>
          </div>

          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Active Items</span>
            <span className={styles.summaryValue}>
              {items.filter((i) => i.isActive).length} of {items.length} messages
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
                Announcement bar saved. The storefront has been refreshed.
              </p>
            ) : null}

            <button
              className={styles.primaryButton}
              type="submit"
              style={{ width: "100%", justifyContent: "center" }}
              disabled={!isReady || !hasCustomizationColumns || pending}
            >
              {pending
                ? "Saving changes…"
                : !hasCustomizationColumns
                  ? "Migration Required to Save"
                  : "Save announcement bar"}
            </button>

            {!hasCustomizationColumns && isReady && (
              <p className={styles.previewNote} style={{ marginTop: "10px", textAlign: "center" }}>
                * Saving paused until migration SQL is run in Supabase.
              </p>
            )}
          </div>
        </div>
      </div>
    </form>
  );
}

"use client";

import { useActionState } from "react";
import type { StoreSettings } from "@/lib/supabase-admin";
import { saveSettingsAction } from "../../actions";
import styles from "../../admin.module.css";

export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const [state, formAction, pending] = useActionState(saveSettingsAction, { error: null });

  return (
    <form className={styles.editorForm} action={formAction} noValidate>
      {/* 1. Store Details */}
      <fieldset>
        <legend>Store Details</legend>
        <div className={styles.fieldGrid}>
          <label className={styles.fieldWide}>
            Store Name
            <input
              name="store_name"
              required
              maxLength={160}
              defaultValue={settings.store_name}
              placeholder="e.g. NS Home Appliances"
            />
            <span className={styles.fieldHelp}>
              Official retail brand name displayed in headers, footers, and page titles.
            </span>
          </label>

          <label className={styles.fieldWide}>
            Official WhatsApp Number
            <input
              name="whatsapp"
              type="tel"
              maxLength={60}
              placeholder="e.g. 0300 6791460 or +92 300 6791460"
              defaultValue={settings.whatsapp ?? ""}
            />
            <span className={styles.fieldHelp}>
              Destination number for customer &quot;Inquire on WhatsApp&quot; product buttons. Defaults to 0300 6791460 if left blank.
            </span>
          </label>
        </div>
      </fieldset>

      {/* 2. Contact & Location */}
      <fieldset>
        <legend>Contact &amp; Location</legend>
        <div className={styles.fieldGrid}>
          <label>
            Showroom Phone Number
            <input
              name="phone"
              type="tel"
              autoComplete="tel"
              maxLength={60}
              placeholder="e.g. 0300 6791460"
              defaultValue={settings.phone ?? ""}
            />
            <span className={styles.fieldHelp}>
              Calling number for the &quot;Call Now&quot; button on the Contact page.
            </span>
          </label>

          <label>
            Store Email Address
            <input
              name="email"
              type="email"
              autoComplete="email"
              maxLength={120}
              placeholder="e.g. info@nshomeappliances.com"
              defaultValue={settings.email ?? ""}
            />
            <span className={styles.fieldHelp}>
              Optional customer support email. Leave blank if not used.
            </span>
          </label>

          <label className={styles.fieldWide}>
            Physical Showroom Address
            <textarea
              name="address"
              rows={3}
              maxLength={600}
              placeholder="e.g. Nowshera Road, Near General Bus Stand, Gujranwala, Punjab, Pakistan"
              defaultValue={settings.address ?? ""}
            />
            <span className={styles.fieldHelp}>
              Optional physical showroom location. Leave blank if not ready to publish.
            </span>
          </label>

          <label className={styles.fieldWide}>
            Showroom Operating Hours
            <textarea
              name="hours"
              rows={3}
              maxLength={400}
              placeholder="Monday – Saturday: 10:00 AM – 9:00 PM&#10;Sunday: 2:00 PM – 8:00 PM"
              defaultValue={settings.hours ?? ""}
            />
            <span className={styles.fieldHelp}>
              Optional business visiting schedule. Leave blank if flexible.
            </span>
          </label>
        </div>
      </fieldset>

      {state.success ? (
        <p className={styles.formSuccess} role="status">
          Settings saved successfully.
        </p>
      ) : null}

      {state.error ? (
        <p className={styles.formError} role="alert">
          {state.error}
        </p>
      ) : null}

      <div className={styles.formActions}>
        <button className={styles.primaryButton} type="submit" disabled={pending}>
          {pending ? "Saving changes…" : "Save Changes"}
        </button>
      </div>
    </form>
  );
}

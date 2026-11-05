import { getStoreSettings } from "@/lib/supabase-admin";
import { SettingsForm } from "./settings-form";
import styles from "../../admin.module.css";

// This route is protected by a session-aware parent layout.
export const instant = false;

export default async function AdminSettingsPage() {
  const settings = await getStoreSettings();

  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderTitleGroup}>
          <p className={styles.kicker}>Configuration</p>
          <h1>Store Settings</h1>
          <p className={styles.subtitle}>
            Business identity, WhatsApp inquiry number, contact details, and showroom hours.
          </p>
        </div>
      </div>
      <SettingsForm settings={settings} />
    </>
  );
}

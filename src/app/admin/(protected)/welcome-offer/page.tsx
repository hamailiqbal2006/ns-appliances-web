import { getAdminAccessTokenForRead } from "@/lib/supabase-admin";
import { getAdminWelcomePopupConfig } from "@/lib/welcome-popup-data";
import { WelcomeOfferEditorForm } from "./welcome-offer-editor-form";
import styles from "../../admin.module.css";

export const instant = false;

export default async function WelcomeOfferAdminPage() {
  const accessToken = await getAdminAccessTokenForRead();
  const config = await getAdminWelcomePopupConfig(accessToken);

  return (
    <>
      <div className={styles.pageHeader}>
        <div className={styles.pageHeaderTitleGroup}>
          <p className={styles.kicker}>Storefront</p>
          <h1>Welcome Offer</h1>
          <p className={styles.subtitle}>
            Configure the timed storefront invitation modal to welcome visitors and capture customer WhatsApp contacts.
          </p>
        </div>
      </div>
      <WelcomeOfferEditorForm config={config} />
    </>
  );
}

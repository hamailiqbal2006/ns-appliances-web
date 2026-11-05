import { cookies } from "next/headers";
import { getAdminAnnouncementBar } from "@/lib/announcement-bar";
import { AnnouncementBarEditorForm } from "./announcement-bar-editor-form";
import styles from "../../admin.module.css";

export const instant = false;

export default async function AnnouncementBarPage() {
  const token = (await cookies()).get("ns-admin-access")?.value ?? null;
  const { enabled, theme, separator, speed, messages, isReady, hasCustomizationColumns } =
    await getAdminAnnouncementBar(token);
  return (
    <>
      <div className={styles.pageHeader}>
        <div>
          <p className={styles.kicker}>Homepage administration</p>
          <h1>Announcement bar</h1>
        </div>
      </div>
      <AnnouncementBarEditorForm
        enabled={enabled}
        theme={theme}
        separator={separator}
        speed={speed}
        messages={messages}
        isReady={isReady}
        hasCustomizationColumns={hasCustomizationColumns}
      />
    </>
  );
}

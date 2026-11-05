"use client";

import { Theme } from "@carbon/react";
import { WatsonxAi } from "@carbon/icons-react";
import { useChatStore } from "@/store/chat-store";
import styles from "./chat.module.scss";

export const CHAT_LAUNCHER_ID = "asisten-iku-launcher";
export const CHAT_PANEL_ID = "asisten-iku-panel";

export function ChatLauncher() {
  const isOpen = useChatStore((state) => state.isOpen);
  const toggle = useChatStore((state) => state.toggle);

  return (
    <Theme theme="g100" as="span" className={styles.launcherZone}>
      <button
        id={CHAT_LAUNCHER_ID}
        type="button"
        className={`${styles.launcher}${isOpen ? ` ${styles.launcherActive}` : ""}`}
        aria-expanded={isOpen}
        aria-controls={CHAT_PANEL_ID}
        aria-label="Asisten IKU"
        title="Asisten IKU"
        onClick={toggle}
      >
        <WatsonxAi size={20} aria-hidden="true" />
        <span className={styles.launcherLabel}>Asisten IKU</span>
      </button>
    </Theme>
  );
}

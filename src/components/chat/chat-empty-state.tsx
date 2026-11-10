"use client";

import { ClickableTile, Tag } from "@carbon/react";
import { ArrowUpRight, Calculation, DataAnalytics, Help, WatsonxAi } from "@carbon/icons-react";
import { getStarterPrompts } from "@/lib/chat-mock";
import type { ChatScope, StarterPrompt } from "@/types/chat";
import styles from "./chat.module.scss";

const categoryMeta: Record<
  StarterPrompt["category"],
  { label: string; tag: "blue" | "gray" | "green"; icon: typeof Calculation }
> = {
  kalkulasi: { label: "Kalkulasi", tag: "blue", icon: Calculation },
  "tanya-jawab": { label: "Tanya jawab", tag: "gray", icon: Help },
  "data-modul": { label: "Data modul", tag: "green", icon: DataAnalytics },
};

type ChatEmptyStateProps = {
  scope: ChatScope;
  userName?: string;
  onSelect: (question: string) => void;
};

export function ChatEmptyState({ scope, userName, onSelect }: ChatEmptyStateProps) {
  const isIku = scope.kind === "iku";
  return (
    <div>
      <div className={styles.emptyIcon} aria-hidden="true">
        <WatsonxAi size={32} />
      </div>
      {userName && <p className={styles.emptyGreeting}>Halo, {userName}</p>}
      <h3 className={styles.emptyTitle}>
        {isIku ? `Apa yang ingin Anda ketahui tentang ${scope.label}?` : "Apa yang ingin Anda ketahui tentang capaian IKU hari ini?"}
      </h3>
      <p className={styles.emptyDescription}>
        {isIku
          ? `Di halaman ini saya khusus menjawab seputar ${scope.label} – ${scope.title}: definisi, kriteria, formula, dan capaian dari Buku IKU Diktisaintek Berdampak V1 serta data modul.`
          : "Di halaman Overview saya menjawab ringkasan capaian lintas IKU dan konsep umum dari Buku IKU Diktisaintek Berdampak V1. Pertanyaan rinci per indikator dijawab di halaman IKU masing-masing."}
      </p>

      <h4 className={styles.starterLabel}>Mulai dengan</h4>
      {/* DATA: contoh pertanyaan bisa berasal dari analitik pertanyaan populer (FR-15) */}
      <ul className={styles.starterList}>
        {getStarterPrompts(scope).map((prompt) => {
          const meta = categoryMeta[prompt.category];
          const Icon = meta.icon;
          return (
            <li key={prompt.id}>
              <ClickableTile
                className={styles.starterTile}
                onClick={(event) => {
                  event.preventDefault();
                  onSelect(prompt.question);
                }}
                href="#"
              >
                <span className={styles.starterTitle}>
                  <Icon size={16} aria-hidden="true" />
                  <span>{prompt.title}</span>
                  <ArrowUpRight size={16} aria-hidden="true" />
                </span>
                <Tag type={meta.tag} size="sm" className={styles.starterTag}>
                  {meta.label}
                </Tag>
              </ClickableTile>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Button, Popover, PopoverContent } from "@carbon/react";
import { Book } from "@carbon/icons-react";
import type { Citation } from "@/types/chat";
import styles from "./chat.module.scss";

function citationLabel(citation: Citation, index: number) {
  const parts = [citation.section, citation.page ? `hlm. ${citation.page}` : undefined].filter(Boolean);
  return `[${index + 1}] ${parts.join(" · ") || citation.documentTitle}`;
}

function CitationItem({ citation, index }: { citation: Citation; index: number }) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onRequestClose={() => setOpen(false)} align="top-start" autoAlign caret dropShadow>
      <Button
        kind="tertiary"
        size="sm"
        className={styles.citationButton}
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <Book size={16} aria-hidden="true" />
        <span>{citationLabel(citation, index)}</span>
      </Button>
      <PopoverContent className={styles.citationPopover}>
        <p className={styles.citationPopoverTitle}>{citation.documentTitle}</p>
        <p className={styles.citationPopoverMeta}>
          Versi {citation.documentVersion}
          {citation.ikuCode ? ` · ${citation.ikuCode}` : ""}
          {citation.section ? ` · ${citation.section}` : ""}
          {citation.page ? ` · hlm. ${citation.page}` : ""}
        </p>
        <p className={styles.citationPopoverSnippet}>“{citation.snippet}”</p>
      </PopoverContent>
    </Popover>
  );
}

export function CitationList({ citations }: { citations: Citation[] }) {
  if (citations.length === 0) return null;

  return (
    <div className={styles.citations}>
      <p className={styles.citationsLabel}>Sumber ({citations.length})</p>
      {citations.map((citation, index) => (
        <CitationItem key={citation.id} citation={citation} index={index} />
      ))}
    </div>
  );
}

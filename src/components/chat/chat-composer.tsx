"use client";

import { forwardRef, useState } from "react";
import { Button, IconButton, TextArea } from "@carbon/react";
import { Attachment, Send, StopFilledAlt } from "@carbon/icons-react";
import styles from "./chat.module.scss";

export const MAX_QUESTION_LENGTH = 2000;

type ChatComposerProps = {
  placeholder: string;
  isSending: boolean;
  onSend: (question: string) => void;
  onStop: () => void;
};

export const ChatComposer = forwardRef<HTMLTextAreaElement, ChatComposerProps>(function ChatComposer(
  { placeholder, isSending, onSend, onStop },
  ref
) {
  const [value, setValue] = useState("");
  const canSend = value.trim().length > 0 && !isSending;

  const submit = () => {
    if (!canSend) return;
    onSend(value);
    setValue("");
  };

  return (
    <form
      className={styles.composer}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <div className={styles.composerField}>
        <TextArea
          ref={ref}
          id="asisten-iku-input"
          labelText="Pertanyaan untuk Asisten IKU"
          hideLabel
          rows={2}
          placeholder={placeholder}
          value={value}
          onChange={(event) => setValue(event.target.value.slice(0, MAX_QUESTION_LENGTH))}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) {
              event.preventDefault();
              submit();
            }
          }}
        />
        <div className={styles.composerToolbar}>
          {/* Unggah lampiran belum termasuk scope PRD v1.0 (upload dokumen hanya via modul admin). */}
          <IconButton kind="ghost" size="sm" label="Lampirkan berkas (segera hadir)" disabled>
            <Attachment />
          </IconButton>
          <span
            className={`${styles.composerCounter}${value.length >= MAX_QUESTION_LENGTH ? ` ${styles.composerCounterOver}` : ""}`}
            aria-live="polite"
          >
            {value.length}/{MAX_QUESTION_LENGTH}
          </span>
          {isSending ? (
            <Button kind="secondary" size="md" renderIcon={StopFilledAlt} onClick={onStop}>
              Hentikan
            </Button>
          ) : (
            <IconButton type="submit" kind="primary" size="md" label="Kirim pertanyaan" disabled={!canSend}>
              <Send />
            </IconButton>
          )}
        </div>
      </div>
    </form>
  );
});

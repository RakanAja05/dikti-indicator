"use client";

import { useEffect, useRef, useSyncExternalStore } from "react";
import { IconButton, Tag, Theme } from "@carbon/react";
import { AddComment, Book, ChartBar, Close, Information, Maximize, Minimize, WatsonxAi } from "@carbon/icons-react";
import { CHAT_DISCLAIMER } from "@/lib/chat-mock";
import { useChatStore, useChatThread } from "@/store/chat-store";
import { AiExplainability } from "./assistant-message";
import { ChatComposer } from "./chat-composer";
import { ChatEmptyState } from "./chat-empty-state";
import { CHAT_LAUNCHER_ID, CHAT_PANEL_ID } from "./chat-launcher";
import { MessageList } from "./message-list";
import { useChatScope } from "./use-chat-scope";
import styles from "./chat.module.scss";

const SESSION_KEY = "iku-user-session";
const SCROLL_STICK_THRESHOLD = 80;
/** Breakpoint md Carbon (42rem). */
const DESKTOP_QUERY = "(min-width: 42rem)";

function subscribeStorage(callback: () => void) {
  window.addEventListener("storage", callback);
  return () => window.removeEventListener("storage", callback);
}

/** Nama depan pengguna dari sesi lokal — hanya untuk sapaan, bukan dasar keamanan. */
function useFirstName() {
  const raw = useSyncExternalStore(
    subscribeStorage,
    () => {
      try {
        return localStorage.getItem(SESSION_KEY);
      } catch {
        return null;
      }
    },
    () => null
  );
  if (!raw) return undefined;
  try {
    const name = (JSON.parse(raw) as { name?: string }).name;
    return name ? name.trim().split(/\s+/)[0] : undefined;
  } catch {
    return undefined;
  }
}

export function ChatPanel() {
  const isOpen = useChatStore((state) => state.isOpen);
  const isExpanded = useChatStore((state) => state.isExpanded);
  const { close, toggleExpanded, newChat, send, stop } = useChatStore.getState();

  const scope = useChatScope();
  const thread = useChatThread(scope.id);
  const { messages, isSending } = thread;
  const isIku = scope.kind === "iku";

  const firstName = useFirstName();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // Saat dibuka: fokus ke input di layar lebar, ke judul panel di mobile (agar keyboard tidak langsung muncul).
  // Saat ditutup: kembalikan fokus ke launcher.
  useEffect(() => {
    if (!isOpen) return;
    if (window.matchMedia(DESKTOP_QUERY).matches) inputRef.current?.focus();
    else titleRef.current?.focus();
    return () => document.getElementById(CHAT_LAUNCHER_ID)?.focus();
  }, [isOpen]);

  // Pindah halaman = pindah percakapan; mulai dari bagian bawah percakapan cakupan tersebut.
  useEffect(() => {
    stickToBottom.current = true;
  }, [scope.id]);

  // Auto-scroll hanya jika pengguna sedang berada di dekat bagian bawah.
  useEffect(() => {
    const body = bodyRef.current;
    if (!body) return;
    if (messages.length === 0) {
      body.scrollTop = 0;
      stickToBottom.current = true;
    } else if (stickToBottom.current) {
      body.scrollTop = body.scrollHeight;
    }
  }, [messages, scope.id]);

  if (!isOpen) return null;

  const handleSend = (question: string) => {
    stickToBottom.current = true;
    void send(question, scope);
    inputRef.current?.focus();
  };

  return (
    <Theme
      as="aside"
      theme="g10"
      id={CHAT_PANEL_ID}
      className={`${styles.panel}${isExpanded ? ` ${styles.panelExpanded}` : ""}`}
      aria-labelledby="asisten-iku-title"
      onKeyDown={(event) => {
        if (event.key === "Escape" && !event.defaultPrevented) close();
      }}
    >
      <header className={styles.panelHeader}>
        <h2 id="asisten-iku-title" ref={titleRef} tabIndex={-1} className={styles.panelTitle}>
          <WatsonxAi size={20} aria-hidden="true" />
          Asisten IKU
          <AiExplainability size="2xs" />
        </h2>
        <div className={styles.panelActions}>
          <IconButton
            kind="ghost"
            size="lg"
            label={`Percakapan baru di ${scope.label}`}
            align="bottom"
            onClick={() => newChat(scope.id)}
          >
            <AddComment />
          </IconButton>
          <IconButton
            kind="ghost"
            size="lg"
            label={isExpanded ? "Perkecil panel" : "Perbesar panel"}
            align="bottom"
            wrapperClasses={styles.expandAction}
            onClick={toggleExpanded}
          >
            {isExpanded ? <Minimize /> : <Maximize />}
          </IconButton>
          <IconButton kind="ghost" size="lg" label="Tutup Asisten IKU" align="bottom-end" onClick={close}>
            <Close />
          </IconButton>
        </div>
      </header>

      <section className={styles.context} aria-label="Cakupan jawaban" aria-live="polite">
        <p className={styles.contextLabel}>Cakupan jawaban</p>
        <div className={styles.contextTags}>
          <Tag type="blue" size="md" renderIcon={ChartBar} title={`${scope.label} – ${scope.title}`}>
            {isIku ? `${scope.label} · ${scope.title}` : "Overview · Ringkasan lintas IKU"}
          </Tag>
          {/* DATA: versi dokumen aktif dari knowledge base (GET /api/knowledge/documents) */}
          <Tag type="outline" size="md" renderIcon={Book}>
            Buku IKU V1
          </Tag>
        </div>
        <p className={styles.contextHint}>
          {isIku
            ? `Hanya menjawab seputar ${scope.label}. Pertanyaan IKU lain diarahkan ke halamannya.`
            : "Pertanyaan rinci per indikator diarahkan ke halaman IKU masing-masing."}
        </p>
      </section>

      <div
        ref={bodyRef}
        className={styles.body}
        onScroll={(event) => {
          const el = event.currentTarget;
          stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < SCROLL_STICK_THRESHOLD;
        }}
      >
        <div className={styles.bodyInner}>
          {messages.length === 0 ? (
            <ChatEmptyState scope={scope} userName={firstName} onSelect={handleSend} />
          ) : (
            <MessageList scope={scope} thread={thread} />
          )}
        </div>
      </div>

      <ChatComposer
        key={scope.id}
        ref={inputRef}
        placeholder={
          isIku ? `Tanyakan formula, kalkulasi, atau data ${scope.label}…` : "Tanyakan ringkasan capaian atau konsep IKU…"
        }
        isSending={isSending}
        onSend={handleSend}
        onStop={() => stop(scope.id)}
      />

      <p className={styles.disclaimer}>
        <Information size={16} aria-hidden="true" />
        {CHAT_DISCLAIMER}
      </p>
    </Theme>
  );
}

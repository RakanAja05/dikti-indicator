"use client";

import type { ChatThread } from "@/store/chat-store";
import type { ChatScope } from "@/types/chat";
import { AssistantMessage } from "./assistant-message";
import styles from "./chat.module.scss";

const dateFormat = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });
const timeFormat = new Intl.DateTimeFormat("id-ID", { hour: "2-digit", minute: "2-digit" });

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const formatted = dateFormat.format(date);
  if (date.toDateString() === today.toDateString()) return `Hari ini, ${formatted}`;
  if (date.toDateString() === yesterday.toDateString()) return `Kemarin, ${formatted}`;
  return formatted;
}

export function MessageList({ scope, thread }: { scope: ChatScope; thread: ChatThread }) {
  const { messages, isSending } = thread;
  if (messages.length === 0) return null;

  return (
    <>
      <p className={styles.divider}>{dayLabel(messages[0].createdAt)}</p>

      <ol className={styles.messageList} role="log" aria-live="polite" aria-label={`Percakapan Asisten IKU · ${scope.label}`}>
        {messages.map((message) => (
          <li key={message.id}>
            {message.role === "user" ? (
              <div className={styles.userMessage}>
                <p className={styles.meta}>
                  Anda · <time dateTime={message.createdAt}>{timeFormat.format(new Date(message.createdAt))}</time>
                </p>
                <p className={styles.userBubble}>{message.text}</p>
              </div>
            ) : (
              <AssistantMessage message={message} scope={scope} isSending={isSending} />
            )}
          </li>
        ))}
      </ol>
    </>
  );
}

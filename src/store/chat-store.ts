"use client";

import { create } from "zustand";
import { sendQuestion } from "@/lib/chat-client";
import type { ChatMessage, ChatScopeRef } from "@/types/chat";

type AssistantMessage = Extract<ChatMessage, { role: "assistant" }>;

/** Satu percakapan per cakupan halaman (Overview, IKU 001, IKU 002, …). */
export type ChatThread = {
  conversationId?: string;
  messages: ChatMessage[];
  isSending: boolean;
};

export const EMPTY_THREAD: ChatThread = {
  messages: [],
  isSending: false,
};

type ChatState = {
  isOpen: boolean;
  isExpanded: boolean;
  threads: Record<string, ChatThread>;
  open: () => void;
  close: () => void;
  toggle: () => void;
  toggleExpanded: () => void;
  newChat: (scopeId: string) => void;
  send: (question: string, scope: ChatScopeRef) => Promise<void>;
  retry: (messageId: string, scope: ChatScopeRef) => Promise<void>;
  stop: (scopeId: string) => void;
};

const controllers = new Map<string, AbortController>();

const createId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export const useChatStore = create<ChatState>((set, get) => {
  const thread = (scopeId: string) => get().threads[scopeId] ?? EMPTY_THREAD;

  const updateThread = (scopeId: string, update: (current: ChatThread) => Partial<ChatThread>) =>
    set((state) => {
      const current = state.threads[scopeId] ?? EMPTY_THREAD;
      return { threads: { ...state.threads, [scopeId]: { ...current, ...update(current) } } };
    });

  const updateAssistant = (scopeId: string, id: string, patch: (m: AssistantMessage) => Partial<AssistantMessage>) =>
    updateThread(scopeId, (current) => ({
      messages: current.messages.map((m) => (m.id === id && m.role === "assistant" ? { ...m, ...patch(m) } : m)),
    }));

  const runQuestion = async (scope: ChatScopeRef, assistantId: string, question: string) => {
    controllers.get(scope.id)?.abort();
    const controller = new AbortController();
    controllers.set(scope.id, controller);
    updateThread(scope.id, () => ({ isSending: true }));

    try {
      const answer = await sendQuestion(
        { conversationId: thread(scope.id).conversationId, question, scope },
        {
          signal: controller.signal,
          onStatus: (statusText) => updateAssistant(scope.id, assistantId, () => ({ statusText })),
          onToken: (chunk) => updateAssistant(scope.id, assistantId, (m) => ({ text: m.text + chunk })),
        }
      );
      updateThread(scope.id, () => ({ conversationId: answer.conversationId }));
      updateAssistant(scope.id, assistantId, () => ({
        status: "done",
        text: answer.answer,
        answer,
        statusText: undefined,
      }));
    } catch (error) {
      const aborted = error instanceof DOMException && error.name === "AbortError";
      updateAssistant(scope.id, assistantId, (m) => ({
        status: "error",
        statusText: undefined,
        error: aborted
          ? m.text
            ? "Jawaban dihentikan sebelum selesai."
            : "Permintaan dihentikan."
          : error instanceof Error
            ? error.message
            : "Gagal memproses pertanyaan.",
      }));
    } finally {
      if (controllers.get(scope.id) === controller) controllers.delete(scope.id);
      updateThread(scope.id, () => ({ isSending: false }));
    }
  };

  return {
    isOpen: false,
    isExpanded: false,
    threads: {},

    open: () => set({ isOpen: true }),
    close: () => set({ isOpen: false }),
    toggle: () => set((state) => ({ isOpen: !state.isOpen })),
    toggleExpanded: () => set((state) => ({ isExpanded: !state.isExpanded })),

    newChat: (scopeId) => {
      get().stop(scopeId);
      updateThread(scopeId, () => ({ conversationId: undefined, messages: [] }));
    },

    send: async (question, scope) => {
      const text = question.trim();
      if (!text || thread(scope.id).isSending) return;
      const now = new Date().toISOString();
      const assistantId = createId();
      updateThread(scope.id, (current) => ({
        messages: [
          ...current.messages,
          { id: createId(), role: "user", text, createdAt: now },
          {
            id: assistantId,
            role: "assistant",
            createdAt: now,
            status: "streaming",
            statusText: "Menyiapkan pencarian…",
            text: "",
            question: text,
          },
        ],
      }));
      await runQuestion(scope, assistantId, text);
    },

    retry: async (messageId, scope) => {
      const target = thread(scope.id).messages.find((m) => m.id === messageId);
      if (!target || target.role !== "assistant" || thread(scope.id).isSending) return;
      updateAssistant(scope.id, messageId, () => ({
        status: "streaming",
        statusText: "Menyiapkan pencarian…",
        text: "",
        answer: undefined,
        error: undefined,
        createdAt: new Date().toISOString(),
      }));
      await runQuestion(scope, messageId, target.question);
    },

    stop: (scopeId) => {
      controllers.get(scopeId)?.abort();
    },
  };
});

/** Thread milik cakupan tertentu; mengembalikan EMPTY_THREAD (referensi stabil) bila belum ada. */
export function useChatThread(scopeId: string) {
  return useChatStore((state) => state.threads[scopeId] ?? EMPTY_THREAD);
}

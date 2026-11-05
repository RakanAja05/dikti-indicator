// Kontrak data Asisten IKU (chatbot RAG).
// Usulan untuk disepakati dengan BE — lihat docs/api-requests/asisten-iku-chat.md.

export type ChatRequest = {
  conversationId?: string;
  question: string;
  /** Cakupan halaman aktif. Server WAJIB membatasi retrieval & jawaban pada cakupan ini. */
  scope: ChatScopeRef;
};

/** Cakupan jawaban per halaman dasbor: Overview (lintas IKU) atau satu IKU. */
export type ChatScope = {
  /** "overview" atau kode IKU, mis. "IKU 001". */
  id: string;
  kind: "overview" | "iku";
  ikuCode?: string;
  /** Label singkat, mis. "IKU 001" / "Overview". */
  label: string;
  /** Judul pendek cakupan, mis. "Angka Efisiensi Edukasi". */
  title: string;
};

/** Bentuk cakupan yang dikirim ke server. */
export type ChatScopeRef = Pick<ChatScope, "id" | "kind" | "ikuCode">;

export type Citation = {
  id: string;
  documentTitle: string;
  documentVersion: string;
  section?: string;
  page?: number;
  ikuCode?: string;
  snippet: string;
};

/** Blok konten terstruktur di dalam jawaban. Semua berupa teks/angka, tanpa HTML. */
export type AnswerBlock =
  | { type: "text"; text: string }
  | { type: "note"; text: string }
  | {
      type: "metric";
      label: string;
      value: number;
      target: number;
      caption: string;
    }
  | { type: "formula"; lines: string[] }
  | {
      type: "table";
      columns: { key: string; header: string; align?: "start" | "end"; emphasis?: boolean }[];
      rows: Record<string, string>[];
    }
  | { type: "list"; variant: "excluded" | "included"; items: string[] };

export type AnswerAction = {
  label: string;
  /** Tab dasbor tujuan, mis. "IKU 001". */
  dashboardTab: string;
};

export type ChatAnswer = {
  conversationId: string;
  messageId: string;
  answer: string;
  blocks?: AnswerBlock[];
  citations: Citation[];
  grounded: boolean;
  confidence?: "tinggi" | "sedang" | "rendah";
  action?: AnswerAction;
  /** Diisi jika pertanyaan di luar cakupan halaman; jawaban tidak diproses lebih lanjut. */
  outOfScope?: {
    /** Tab dasbor yang sesuai dengan pertanyaan, bila terdeteksi (mis. "IKU 009"). */
    suggestedTab?: string;
  };
  disclaimer: string;
};

export type ChatError = { error: string };

export type ChatMessage =
  | {
      id: string;
      role: "user";
      text: string;
      createdAt: string;
    }
  | {
      id: string;
      role: "assistant";
      createdAt: string;
      status: "streaming" | "done" | "error";
      /** Teks progres retrieval saat status "streaming" dan jawaban belum masuk. */
      statusText?: string;
      text: string;
      answer?: ChatAnswer;
      error?: string;
      /** Pertanyaan asal, untuk tombol "Coba lagi" saat jawaban gagal. */
      question: string;
    };

export type StarterPrompt = {
  id: string;
  title: string;
  question: string;
  category: "kalkulasi" | "tanya-jawab" | "data-modul";
};

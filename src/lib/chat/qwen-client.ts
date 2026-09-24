import type { QwenMessage } from "@/lib/chat/types";

/**
 * Kontrak yang harus dipenuhi implementasi Qwen apa pun.
 * chat-service.ts hanya bergantung pada interface ini, tidak pernah
 * pada detail HTTP/format server Qwen — supaya implementasi asli bisa
 * disubstitusi tanpa mengubah chat-service.ts sama sekali.
 */
export interface QwenClient {
  chat(messages: QwenMessage[]): Promise<string>;
}

/**
 * STUB — belum ada implementasi HTTP asli ke server Qwen lokal.
 * Menunggu keputusan cara serving (Ollama / vLLM / custom) dari AI engineer.
 *
 * TODO: ganti export `qwenClient` di bawah dengan implementasi asli
 * (mis. `HttpQwenClient`) begitu cara serving Qwen dipastikan.
 */
export class StubQwenClient implements QwenClient {
  async chat(_messages: QwenMessage[]): Promise<string> {
    return "Ini jawaban dummy dari StubQwenClient. Ganti dengan implementasi asli setelah server Qwen siap.";
  }
}

export const qwenClient: QwenClient = new StubQwenClient();
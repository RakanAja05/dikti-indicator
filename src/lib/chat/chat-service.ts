import type { QwenClient } from "@/lib/chat/qwen-client";
import { buildSystemPrompt, buildDataFollowupPrompt } from "@/lib/chat/prompt";
import { executeTool, getAvailableFilters } from "@/lib/chat/spreadsheet-tool";
import {
  type AuthContext,
  type QwenMessage,
  type ParsedQwenResponse,
  type ToolResult,
  LlmTimeoutError,
  LlmUnavailableError,
  LlmBadResponseError,
} from "@/lib/chat/types";

export function parseQwenResponse(rawText: string): ParsedQwenResponse {
  const trimmed = rawText.trim();

  const jsonMatch = trimmed.match(/```json\s*([\s\S]*?)\s*```/);
  if (jsonMatch) {
    try {
      const obj = JSON.parse(jsonMatch[1].trim());
      if (obj.action === "fetch_data") {
        return { type: "tool_request", request: obj };
      }
    } catch {
      // invalid JSON, fall through
    }
  }

  try {
    const obj = JSON.parse(trimmed);
    if (obj.action === "fetch_data") {
      return { type: "tool_request", request: obj };
    }
  } catch {
    // tidak JSON
  }

  return { type: "answer", content: trimmed };
}

export async function handleChatMessage(
  user: AuthContext,
  message: string
): Promise<{ answer: string }> {
  const MAX_MESSAGE_LENGTH = 2000;
  const trimmedMessage = message.trim();
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return { answer: "Pertanyaan terlalu panjang. Mohon singkatkan (max 2000 karakter)." };
  }

  // Lazy load client saat pertama kali handleChatMessage dipanggil
  const qwenModule = await import("./qwen-client");
  const { getQwenClient } = qwenModule;
  const client = getQwenClient();

  const systemPrompt = buildSystemPrompt();
  const messages: QwenMessage[] = [
    { role: "system", content: systemPrompt },
    { role: "user", content: trimmedMessage },
  ];

  let response: string;

  try {
    response = await client.chat(messages);
  } catch (error) {
    if (error instanceof LlmTimeoutError) {
      return { answer: "Maaf, permintaan ke server AI terlalu lama. Coba lagi nanti." };
    }
    if (error instanceof LlmUnavailableError) {
      return { answer: "Maaf, layanan AI sedang tidak tersedia. Coba lagi nanti." };
    }
    if (error instanceof LlmBadResponseError) {
      return { answer: "Maaf, terjadi kesalahan saat memproses permintaan Anda." };
    }
    console.error("Chat request error:", error);
    return { answer: "Maaf, terjadi kesalahan dalam memproses permintaan Anda." };
  }

  const parsed = parseQwenResponse(response);

  if (parsed.type === "answer") {
    return { answer: parsed.content };
  }

  const toolResult = await executeTool(user, parsed.request);
  const resultJson = JSON.stringify(toolResult);

  messages.push({ role: "assistant", content: response });
  messages.push({ role: "user", content: buildDataFollowupPrompt(resultJson) });

  try {
    const finalResponse = await client.chat(messages);
    return { answer: finalResponse };
  } catch (error) {
    if (error instanceof LlmTimeoutError) {
      return { answer: "Maaf, permintaan ke server AI terlalu lama setelah mengambil data. Coba lagi nanti." };
    }
    if (error instanceof LlmUnavailableError) {
      return { answer: "Maaf, layanan AI sedang tidak tersedia setelah mengambil data. Coba lagi nanti." };
    }
    if (error instanceof LlmBadResponseError) {
      if (toolResult.status === "no_match") {
        return { answer: `Data tidak ditemukan untuk filter yang diminta.\n${toolResult.message}\nFilter tersedia: ${JSON.stringify(toolResult.availableFilters)}` };
      }
      if (toolResult.status === "error") {
        return { answer: `Gagal memproses data: ${toolResult.message}.` };
      }
      if (toolResult.status === "no_source") {
        return { answer: toolResult.message };
      }
      return { answer: "Maaf, terjadi kesalahan saat memproses permintaan Anda." };
    }
    console.error("Chat final request error:", error);
    return { answer: "Maaf, terjadi kesalahan dalam memproses permintaan Anda." };
  }
}

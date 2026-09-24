import { qwenClient } from "@/lib/chat/qwen-client";
import { SYSTEM_PROMPT, buildDataFollowupPrompt } from "@/lib/chat/prompt";
import { querySpreadsheet } from "@/lib/chat/spreadsheet-tool";
import type { AuthContext, QwenMessage, ParsedQwenResponse } from "@/lib/chat/types";

/**
 * STUB — parsing response Qwen bergantung pada format prompt final yang
 * masih dalam riset (lihat SYSTEM_PROMPT di prompt.ts). Untuk sekarang
 * SELALU treat response sebagai jawaban langsung, supaya seluruh alur
 * route -> chat-service tetap bisa ditest end-to-end dengan StubQwenClient
 * (tool tidak akan pernah terpanggil selama fungsi ini masih stub).
 *
 * TODO: implementasikan deteksi JSON {"needsData": true, "query": "..."}
 * begitu format final disepakati dengan AI engineer. Signature TIDAK
 * perlu berubah — pemanggil (handleChatMessage) tidak bergantung pada
 * detail parsing di dalamnya.
 */
function parseQwenResponse(rawText: string): ParsedQwenResponse {
  return { type: "answer", content: rawText };
}

export async function handleChatMessage(
  user: AuthContext,
  message: string
): Promise<{ answer: string }> {
  const messages: QwenMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: message }
  ];

  const firstResponse = await qwenClient.chat(messages);
  const parsed = parseQwenResponse(firstResponse);

  if (parsed.type === "answer") {
    return { answer: parsed.content };
  }

  // parsed.type === "needsData"
  const toolResult = await querySpreadsheet(user, parsed.query);

  messages.push({ role: "assistant", content: firstResponse });
  messages.push({
    role: "user",
    content: buildDataFollowupPrompt(JSON.stringify(toolResult))
  });

  // Maksimal 1 round tool-call — response kedua selalu dianggap final,
  // untuk mencegah infinite loop kalau Qwen minta data lagi.
  const finalResponse = await qwenClient.chat(messages);
  return { answer: finalResponse };
}
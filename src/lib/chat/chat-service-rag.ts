import { executeTool } from "@/lib/chat/spreadsheet-tool";
import type {
  AuthContext,
  ToolResult,
  ChatAnswer,
} from "@/lib/chat/types";
import { getRagClient } from "@/lib/chat/rag-client";



/**
 * Handle chat menggunakan RAG service (IKU Chatbot).
 */
export async function handleChatMessage(
  user: AuthContext,
  message: string,
  scope?: { kind?: string; ikuCode?: string }
): Promise<ChatAnswer> {
  const MAX_MESSAGE_LENGTH = 2000;
  const trimmedMessage = message.trim();
  if (trimmedMessage.length > MAX_MESSAGE_LENGTH) {
    return {
      answer: "Pertanyaan terlalu panjang. Mohon singkatkan (max 2000 karakter).",
      citations: [],
      grounded: true,
      outOfScope: null,
      action: null,
    };
  }

  // 1. RAG retrieval (selalu dilakukan untuk get intent + chunks)
  const ragClient = getRagClient();
  const ragResponse = await ragClient.answer(trimmedMessage, scope);

  // 2. Check RAG response: butuh data spreadsheet?
  const needsData = ragResponse.action?.type === "fetch_data";

  if (needsData) {
    // 3. Butuh data spreadsheet

    // Ambil indicator dari scope, validasi sebagai IndicatorCode
    const VALID_INDICATOR_CODES = ["IKU 001", "IKU 002", "IKU 003", "IKU 005", "IKU 007", "IKU 009"] as const;
    type IndicatorCode = typeof VALID_INDICATOR_CODES[number];
    const rawIndicator = scope?.ikuCode || "IKU 001";
    const indicator: IndicatorCode = (VALID_INDICATOR_CODES as readonly string[]).includes(rawIndicator)
      ? (rawIndicator as IndicatorCode)
      : "IKU 001";

    const spreadsheetRequest = {
      action: "fetch_data" as const,
      indicator,
      year: new Date().getFullYear().toString(),
      faculty: null,
      degree: null,
      aggregation: "none" as const,
      column: null,
    };


    try {
      const toolResult = await executeTool(user, spreadsheetRequest);

      if (toolResult.status === "ok") {
        // Format data untuk LLM-friendly
        const dataContext = formatToolResultForLLM(toolResult);

        // Kirim ulang ke RAG dengan question + spreadsheet_context
        // LLM akan merangkum jawaban berdasarkan data kampus + konteks IKU
        try {
          const ragClient = getRagClient();
          const secondResponse = await ragClient.answerWithSpreadsheet(
            trimmedMessage,
            dataContext,
            scope
          );
          return secondResponse;
        } catch (secondCallError) {
          // Fallback: return data mentah jika second call gagal
          console.error("Second RAG call failed, returning raw data:", secondCallError);
          return {
            answer: `Berikut data ${indicator} kampus Anda:\n\n${dataContext}`,
            citations: ragResponse.citations,
            grounded: true,
            outOfScope: null,
            action: null,
          };
        }
      } else {
        // Tool failed
        return {
          answer: `Gagal mengambil data: ${toolResult.message || "Tidak ada data tersedia"}`,
          citations: [],
          grounded: false,
          outOfScope: null,
          action: null,
        };
      }
    } catch (error) {
      console.error("Error executing tool:", error);
      return {
        answer: "Maaf, terjadi kesalahan saat mengambil data kampus.",
        citations: [],
        grounded: false,
        outOfScope: null,
        action: null,
      };
    }
  } else {
    // 4. Tidak butuh data spreadsheet → return langsung dari RAG
    return ragResponse;
  }
}


/**
 * Format ToolResult menjadi text yang LLM-friendly.
 */
function formatToolResultForLLM(result: ToolResult): string {
  if (result.status !== "ok") {
    return `Error: ${result.message || "Data tidak tersedia"}`;
  }

  const lines: string[] = [];
  
  // Summary
  if (result.summary) {
    lines.push("Ringkasan Data:");
    if (result.summary.totalStudyProgram) {
      lines.push(`- Total Program Studi: ${result.summary.totalStudyProgram}`);
    }
    if (result.summary.totalFaculty) {
      lines.push(`- Total Fakultas: ${result.summary.totalFaculty}`);
    }
    if (result.summary.avgIkuPercentage) {
      lines.push(`- Rata-rata Capaian IKU: ${result.summary.avgIkuPercentage.toFixed(2)}%`);
    }
    lines.push("");
  }

  // Data
  if (result.data && "rows" in result.data) {
    lines.push(`Data Detail (${result.matchedRows} dari ${result.totalRows} baris):`);
    
    const rows = result.data.rows.slice(0, 10); // Max 10 rows untuk display
    rows.forEach((row, idx) => {
      const rowStr = Object.entries(row)
        .map(([k, v]) => `${k}=${v}`)
        .join(", ");
      lines.push(`  ${idx + 1}. ${rowStr}`);
    });
    
    if (result.data.rows.length > 10) {
      lines.push(`  ... dan ${result.data.rows.length - 10} baris lagi`);
    }
  } else if (result.data && "value" in result.data) {
    lines.push(`Hasil Agregasi (${result.data.column}): ${result.data.value}`);
  }

  return lines.join("\n");
}

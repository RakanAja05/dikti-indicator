  import { prisma } from "@/lib/prisma";
  import { parseSpreadsheetUrl } from "@/lib/spreadsheet-parser";
  import type { AuthContext, SpreadsheetToolResult } from "@/lib/chat/types";

  const MAX_ROWS = 200;

  /**
   * Tool yang dijalankan chat-service saat Qwen mendeteksi pertanyaan
   * butuh data spreadsheet. Identitas user WAJIB datang dari AuthContext
   * (hasil auth di route.ts) — tidak pernah dari argumen yang dikirim Qwen.
   *
   * `query` saat ini TIDAK dipakai untuk filtering (sengaja — lihat catatan
   * desain: tidak membuat retrieval/embedding sebelum ada kebutuhan nyata).
   * Parameter dipertahankan di signature untuk kompatibilitas ke depan kalau
   * filtering benar-benar diperlukan nanti (mis. spreadsheet sudah terlalu
   * besar untuk muat di context window).
   */
  export async function querySpreadsheet(
    user: AuthContext,
    query: string
  ): Promise<SpreadsheetToolResult> {
    const connections = await prisma.dataSourceConnection.findMany({
      where: { userEmail: user.email },
      orderBy: { createdAt: "asc" }
    });

    if (connections.length === 0) {
      return {
        status: "no_source",
        message: "User belum menghubungkan spreadsheet/data source apa pun."
      };
    }

    // MVP: pakai connection pertama. Belum ada logic pemilihan source
    // kalau user punya lebih dari satu — sengaja ditunda, lihat desain.
    const connection = connections[0];

    try {
      const { rows, columns } = await parseSpreadsheetUrl(connection.url);
      const truncated = rows.length > MAX_ROWS;

      return {
        status: "ok",
        source: { id: connection.id, name: connection.name },
        columns,
        rows: truncated ? rows.slice(0, MAX_ROWS) : rows,
        truncated
      };
    } catch {
      return {
        status: "error",
        message: "Gagal memproses spreadsheet."
      };
    }
  }
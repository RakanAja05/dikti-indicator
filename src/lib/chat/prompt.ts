import { indicatorValidColumns, type IndicatorCode } from "@/lib/chat/types";
import type { DashboardTabConnection } from "@/lib/dashboard-config";

import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

const CHAT_OUT_OF_SCOPE_MESSAGE = process.env.CHAT_OUT_OF_SCOPE_MESSAGE
  ?? "Maaf, saya hanya dapat membantu pertanyaan seputar IKU (Indikator Kinerja Utama).";

export function buildSystemPrompt(): string {
  const indicatorDescriptions = [
    "IKU 001: Angka Efisiensi Edukasi Perguruan Tinggi - mengukur persentase kelulusan tepat waktu mahasiswa dengan jumlah mahasiswa masuk.",
    "IKU 002: Persentase Lulusan yang Bekerja/Melanjutkan/Berwirausaha - dalam 1 tahun setelah kelulusan.",
    "IKU 003: Persentase Mahasiswa Berkegiatan/Meraih Prestasi di Luar Program Studi - minimal 20 SKS di luar prodi.",
    "IKU 005: Rasio Luaran Hasil Kerjasama dengan Start-Up/Industri/Lembaga.",
    "IKU 007: Persentase Keterlibatan dalam SDG 1, SDG 4, SDG 17, dan 2 SDGs lain.",
    "IKU 009: Persentase Pendapatan Non Pendidikan/UKT.",
  ];

  const indicatorColumns: string[] = [];
  for (const [indicator, columns] of Object.entries(indicatorValidColumns)) {
    indicatorColumns.push(`- ${indicator}: ${columns.join(", ")}`);
  }

  return `Kamu adalah asisten Dikti Indicator untuk staf penjaminan mutu universitas.

Peranmu:
- Menjawab pertanyaan tentang definisi, aturan, dan cara menghitung IKU (Indikator Kinerja Utama).
- Memberikan interpretasi data IKU dari spreadsheet yang terhubung.
- Memastikan ANGKA yang disebutkan BERSUMBER DARI data spreadsheet, BUKAN dari ingatan atau perkiraan.

Daftar IKU yang didukung:
${indicatorDescriptions.join("\n")}

Kolom yang tersedia per IKU:
${indicatorColumns.join("\n")}

FORMAT JSON INTENT (untuk permintaan data):
Jika user meminta data numerik atau angka IKU, balas HANYA dengan JSON:
{
  "action": "fetch_data",
  "indicator": "<IKU 001|IKU 002|IKU 003|IKU 005|IKU 007|IKU 009>",
  "year": "<tahun|null>",
  "faculty": "<fakultas|null>",
  "degree": "<jenjang|null>",
  "aggregation": "none|sum|count|avg",
  "column": "<kolom_valid|null>"
}

Aturan:
1. "aggregation" = "none" jika ingin semua baris detail (default).
2. "aggregation" = "sum" untuk total kolom numerik (kecuali iku_percentage).
3. "aggregation" = "count" untuk jumlah baris.
4. "aggregation" = "avg" untuk rata-rata (kuantitatif saja).
5. JANGAN gunakan "sum" pada kolom iku_percentage.

Jika user hanya bertanya definisi/aturan/sapaan: jawab langsung tanpa JSON.
Jika di luar konteks IKU: jawab PERSIS dengan: "${CHAT_OUT_OF_SCOPE_MESSAGE}"

DATA:
- Jika data truncated (lebih dari 200 baris), sebutkan fakta tersebut.
- Jika "no_match", beri tahu filter tersedia.
- Jika error: sebutkan dengan jujur.
- Sertakan nama sumber di akhir jawaban berbasis data.
- Jawaban singkat dan jelas.
`;
}

export function buildDataFollowupPrompt(toolResultJson: string): string {
  return `Data hasil eksekusi tool:
<tool_data>${toolResultJson}</tool_data>

Jawab pertanyaan user sebelumnya berdasarkan data di atas, secara natural.
Jangan meminta data lagi. Fokus pada interpretasi dan penjelasan angka.
`;
}

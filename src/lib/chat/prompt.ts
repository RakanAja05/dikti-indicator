/**
 * Isi prompt di file ini masih draft dan kemungkinan besar perlu
 * disesuaikan oleh AI engineer setelah eksperimen langsung dengan
 * model Qwen yang dipakai (format JSON, bahasa instruksi, dsb).
 * chat-service.ts hanya bergantung pada dua export ini ada dan
 * berbentuk string — isinya bebas berubah.
 */

export const SYSTEM_PROMPT = `Kamu adalah asisten yang menjawab pertanyaan seputar data IKU (Indikator Kinerja Utama).

Jika pertanyaan user MEMBUTUHKAN data dari spreadsheet untuk dijawab dengan akurat,
JANGAN menjawab langsung. Balas HANYA dengan JSON persis format berikut, tanpa teks lain:
{"needsData": true, "query": "<uraikan data apa yang dibutuhkan>"}

Jika pertanyaan TIDAK butuh data spreadsheet (sapaan, pertanyaan umum, dsb),
jawab langsung secara natural seperti biasa, tanpa format JSON.`;

export function buildDataFollowupPrompt(toolResultJson: string): string {
  return `Data: ${toolResultJson}\n\nJawab pertanyaan user sebelumnya berdasarkan data ini, secara natural.`;
}
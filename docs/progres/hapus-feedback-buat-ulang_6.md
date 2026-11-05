# Hapus Feedback & Buat Ulang Jawaban — Perubahan #6

**Tanggal:** 7 Oktober 2026
**Peran:** FE

## Ringkasan

Tombol suka/tidak suka (feedback) dan "Buat ulang jawaban" dihapus dari setiap jawaban Asisten IKU. Tombol **Salin jawaban** tetap ada. Untuk jawaban yang **gagal dimuat**, tombol "Coba lagi" tetap tersedia (kini tombol berteks, bukan ikon) agar pengguna masih bisa mengulang saat terjadi error.

## Perubahan

| File | Perubahan |
|---|---|
| `src/components/chat/assistant-message.tsx` | hapus tombol feedback dan buat ulang; "Coba lagi" hanya muncul saat `status === "error"` |
| `src/store/chat-store.ts` | hapus `setFeedback` dan field `feedback` pada pesan |
| `src/lib/chat-client.ts` | hapus `sendFeedback` (endpoint feedback) |
| `src/types/chat.ts` | hapus `FeedbackValue` dan `feedback` di `ChatMessage` |
| `docs/api-requests/asisten-iku-chat.md` | endpoint feedback ditandai tidak dibutuhkan; tabel `MessageFeedback` dihapus dari kebutuhan skema |
| PRD Asisten IKU (Claude Docs) | ruang lingkup, kontrak API, kebutuhan fungsional (RAG-10), dan pembagian tugas disesuaikan |

## Verifikasi

- `tsc`: OK.
- ESLint file chat: 0 masalah.

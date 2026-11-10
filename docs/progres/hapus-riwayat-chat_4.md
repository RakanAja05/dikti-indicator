# Hapus Fitur Riwayat Asisten IKU — Perubahan #4

**Tanggal:** 17 September 2026
**Peran:** FE

## Ringkasan

Fitur riwayat percakapan dihapus sesuai permintaan. Percakapan per halaman tetap berjalan selama sesi, lalu hilang saat halaman dimuat ulang. Tombol "Percakapan baru" tetap tersedia untuk mengosongkan chat.

## Yang dihapus

- Tombol **Riwayat** di header panel, beserta tampilan daftar riwayat dan modal hapus (`src/components/chat/chat-history.tsx`).
- Tombol "Tampilkan n pesan sebelumnya".
- Store: `view`, `setView`, `showHidden`, `loadConversation`, `hiddenCount`, `isLoadingConversation`.
- Client: `listConversations`, `getConversationMessages`, `deleteConversation`.
- Mock: `mockConversations`, `getMockConversationMessages`.
- Tipe: `ConversationSummary`.
- Style: `.historyHeader`, `.historyTitle`, `.historyList`, `.historyItemMeta`.
- Dokumen API: endpoint riwayat ditandai tidak dibutuhkan.

## Verifikasi

- `tsc`: OK.
- ESLint file chat: 0 masalah.
- `next build --webpack`: OK.

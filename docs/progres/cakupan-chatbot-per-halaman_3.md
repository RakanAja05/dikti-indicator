# Cakupan Asisten IKU per Halaman Dasbor — Perubahan #3

**Tanggal:** 16 September 2026
**Peran:** FE / AI Engineer
**Dasar:** keputusan stakeholder — chatbot hanya menjawab sesuai halaman dasbor yang dibuka.

## Aturan cakupan

| Halaman | Cakupan jawaban |
|---|---|
| `/dashboard?tab=Overview` | Ringkasan capaian & status lintas IKU, konsep umum (IKU wajib/pilihan, cara umum menghitung capaian) |
| `/dashboard?tab=IKU 00x` | Hanya IKU tersebut: definisi, kriteria, formula, kalkulasi, data modul |
| `/data`, `/quality` | Mengikuti cakupan Overview |

"Dashboard Eksekutif" dan "QS World University Ranking" di menu samping masih berupa grup statis (belum berupa halaman), jadi belum punya cakupan sendiri.

## Perubahan tampilan

1. **"Konteks jawaban" diganti "Cakupan jawaban".** Tag berisi `IKU 001 · Angka Efisiensi Edukasi` (atau `Overview · Ringkasan lintas IKU`), ditambah teks bantuan tentang batas cakupan. Area ini memakai `aria-live` sehingga perubahan cakupan diumumkan ke pembaca layar.
2. **Empty state per halaman:** judul, deskripsi, dan contoh pertanyaan disesuaikan (Overview 4 contoh; tiap IKU 3 contoh).
3. **Placeholder input per halaman:** "Tanyakan formula, kalkulasi, atau data IKU 001…".
4. **Percakapan terpisah per halaman (thread).** Berpindah halaman berarti berpindah percakapan, dan draf input direset. Jawaban yang sedang berjalan tetap masuk ke thread asalnya.
5. **Riwayat per halaman:** judul "Riwayat · IKU 001", difilter berdasarkan `scopeId`.
6. **State baru "di luar cakupan":**
   - jawaban singkat, `InlineNotification` info "Di luar cakupan IKU 009.", dan tombol **"Tanyakan di IKU 001"**;
   - tombol tersebut memindahkan halaman dan mengirim ulang pertanyaan di cakupan tujuan;
   - tombol salin/feedback/buat ulang disembunyikan karena tidak relevan.
7. **Tombol "Buka IKU 00x"** disembunyikan jika pengguna sudah berada di halaman IKU tersebut.

## File

| File | Status | Isi |
|---|---|---|
| `src/lib/chat-scope.ts` | baru | `scopeForTab`, `scopeForLocation`, `findMentionedIku`, nama pendek IKU |
| `src/components/chat/use-chat-scope.ts` | baru (menggantikan `use-chat-context.ts`) | cakupan halaman aktif |
| `src/types/chat.ts` | diubah | `ChatScope`, `ChatScopeRef`; `ChatRequest.scope` (menggantikan `context`); `ChatAnswer.outOfScope`; `ConversationSummary.scopeId` |
| `src/lib/chat-mock.ts` | diubah | contoh pertanyaan per cakupan, deteksi pertanyaan lintas IKU (nomor & topik), jawaban definisi/status per IKU, riwayat per cakupan |
| `src/lib/chat-client.ts` | diubah | mock memakai `scope`; `listConversations(scopeId)` → `GET /api/chat/conversations?scope=` |
| `src/store/chat-store.ts` | diubah | state `threads[scopeId]`; `AbortController` per cakupan; `useChatThread()` |
| `src/components/chat/chat-panel.tsx` | diubah | "Cakupan jawaban", thread per cakupan, placeholder, `key` composer per cakupan |
| `src/components/chat/assistant-message.tsx` | diubah | state di luar cakupan + "Tanyakan di …"; navigasi tab mengikuti pola sinkron menu samping |
| `src/components/chat/message-list.tsx`, `chat-empty-state.tsx`, `chat-history.tsx`, `chat-composer.tsx` | diubah | menerima `scope`/thread |
| `src/components/chat/chat.module.scss` | diubah | `.contextHint`, tag tidak melebihi lebar |
| `docs/api-requests/asisten-iku-chat.md` | diubah | kontrak `scope`, `outOfScope`, aturan cakupan wajib di server, `scopeId` di skema |
| `ai-integration-guide.md` | diubah | prinsip cakupan untuk pipeline RAG |

## Temuan

**Race condition navigasi tab:** `AppShell` menyinkronkan tab aktif dari query `?tab=`. `router.push` memperbarui URL secara asinkron, sehingga tab sempat kembali ke nilai lama. Solusinya, di `/dashboard` URL diperbarui sinkron dengan `history.replaceState` sebelum state tab, sama seperti pola menu samping yang sudah ada.

## Demo mock

| Halaman | Pertanyaan | Hasil |
|---|---|---|
| Overview | "Pendapatan apa saja yang tidak dihitung di IKU 9?" | di luar cakupan → "Tanyakan di IKU 009" |
| IKU 009 | "Hitung capaian AEE PT kami" | di luar cakupan → "Tanyakan di IKU 001" |
| IKU 00x | pertanyaan yang menyebut "IKU wajib/pilihan" | diarahkan ke Overview |
| IKU 001 | contoh "Hitung capaian AEE" | kalkulasi lengkap |
| Setiap IKU | "Apa definisi dan kriteria IKU 00x?" | definisi dari `ikuDashboardDetails` + sitasi |

## Verifikasi

- `tsc`: OK.
- ESLint file chat: 0 masalah. Total proyek tetap 68 (kode lama).
- `next build --webpack`: OK.
- Browser (dev server port 3000):
  - Overview → pertanyaan IKU 9 → tombol → URL `tab=IKU+009`, cakupan IKU 009, jawaban muncul di thread IKU 009;
  - pertanyaan AEE di IKU 009 → di luar cakupan;
  - pindah ke IKU 001 → thread kosong dengan contoh IKU 001;
  - kembali ke IKU 009 → 4 pesan tetap ada;
  - mobile 390px OK.

## Lanjutan

- **BE/AI:** penegakan cakupan di server (filter retrieval `ikuCode`, validasi `conversationId` ↔ `scopeId`).
- **UI/UX:** konfirmasi desain "Cakupan jawaban" dan state di luar cakupan (belum ada di Hifi).
- **Stakeholder:** apakah halaman `/data` & `/quality` perlu cakupan sendiri, atau chat disembunyikan di sana.

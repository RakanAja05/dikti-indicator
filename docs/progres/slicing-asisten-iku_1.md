# Slicing UI Asisten IKU (Chatbot RAG) — Perubahan #1

**Tanggal:** 16 September 2026
**Peran:** FE / AI Engineer
**Sumber desain:** Figma `PMLD-CHATBOT-IKU` (node `61:402`, "Hifi / Dashboard – Panel Tertutup") dan 4 gambar Hifi yang dikirim tim UI/UX (panel terbuka: empty state, jawaban kalkulasi AEE, jawaban sedang dimuat, jawaban IKU 9 dari riwayat).
**Acuan:** `ai-slicing-guide.md`, `ai-integration-guide.md`, `PRD_Chatbot kelompok 17.md`

---

## Ringkasan

Asisten IKU ditambahkan sebagai panel chat di sisi kanan dasbor. Panel dibuka lewat tombol **Asisten IKU** di header, di sebelah profil. Semua tampilan dibangun dari komponen, ikon, dan token IBM Carbon, dan data masih memakai mock. Perubahan pada website yang sudah ada dibatasi pada 3 titik mount di `AppShell` dan 1 baris `@use` di `globals.scss`.

## Changed files

| File | Status | Isi |
|---|---|---|
| `src/types/chat.ts` | baru | Kontrak data: `ChatRequest`, `ChatAnswer`, `AnswerBlock`, `Citation`, `ChatMessage`, `ConversationSummary`, `StarterPrompt` |
| `src/lib/chat-mock.ts` | baru | Mock jawaban (AEE, IKU 9, IKU wajib/pilihan, status modul, tanpa konteks), contoh pertanyaan, riwayat, dan disclaimer |
| `src/lib/chat-client.ts` | baru | Satu pintu akses API: `sendQuestion` (status + token streaming + abort), `listConversations`, `getConversationMessages`, `deleteConversation`, `sendFeedback`. Mock aktif selama `NEXT_PUBLIC_CHAT_MOCK !== "false"` |
| `src/store/chat-store.ts` | baru | Zustand khusus chat: buka/tutup, perbesar, view chat/riwayat, kirim, stop, coba lagi, feedback, muat riwayat |
| `src/components/chat/chat-launcher.tsx` | baru | Tombol header (ikon + label; di mobile hanya ikon), `aria-expanded`/`aria-controls` |
| `src/components/chat/chat-panel.tsx` | baru | Panel: header (judul, AI label, riwayat, percakapan baru, perbesar, tutup), konteks jawaban, area gulir, composer, disclaimer; pengelolaan fokus, tombol Esc, dan auto-scroll |
| `src/components/chat/chat-empty-state.tsx` | baru | Sapaan, judul, deskripsi, dan 4 contoh pertanyaan (`ClickableTile` + `Tag`) |
| `src/components/chat/message-list.tsx` | baru | Pemisah tanggal, "Tampilkan n pesan sebelumnya", pesan user, `role="log"` + `aria-live` |
| `src/components/chat/assistant-message.tsx` | baru | Pesan bot: AI label + explainability, status pencarian + skeleton AI, jawaban, peringatan tanpa konteks, error, aksi (salin, suka/tidak suka, buat ulang, "Buka IKU 00x") |
| `src/components/chat/answer-blocks.tsx` | baru | Kartu capaian (`ProgressBar` + penanda target), formula, tabel (`Table sm`), daftar tidak diakui/diakui, catatan |
| `src/components/chat/citation-list.tsx` | baru | "Sumber (n)": tombol tertiary + `Popover` berisi dokumen, versi, bab, halaman, dan cuplikan |
| `src/components/chat/chat-composer.tsx` | baru | `TextArea` + lampiran (nonaktif) + penghitung 0/2000 + Kirim/Hentikan; Enter untuk kirim, Shift+Enter untuk baris baru |
| `src/components/chat/chat-history.tsx` | baru | Riwayat via SWR (`ContainedList`), menu hapus, konfirmasi `Modal danger` |
| `src/components/chat/use-chat-context.ts` | baru | Konteks halaman aktif (Monev IKU › tab aktif / Data) |
| `src/components/chat/chat.module.scss` | baru | Seluruh style fitur chat memakai token, spacing, type, motion, breakpoint, dan `ai-gradient` Carbon |
| `src/styles/_chat-layout.scss` | baru | Variabel lebar panel; push konten `.app-content` di layar ≥ lg; kelas zona tema Carbon (`@carbon/react/scss/zone`) |
| `src/app/globals.scss` | diubah (+3 baris) | `@use '../styles/chat-layout';` |
| `src/components/layout/app-shell.tsx` | diubah (+11/−1) | import; `<ChatLauncher />` sebelum menu profil; kelas `app-content--chat-open/expanded` pada `<Content>`; `<ChatPanel />` setelah `</Content>` |
| `docs/api-requests/asisten-iku-chat.md` | baru | Permintaan endpoint, skema, auth, dan env untuk BE/AI Ops |

## Komponen Carbon yang dipakai

`Theme`, `AILabel`, `AILabelContent`, `IconButton`, `Button` (tertiary/secondary/ghost), `CopyButton`, `Tag`, `ClickableTile`, `TextArea`, `SkeletonText` (varian AI `cds--skeleton__text--ai`), `InlineNotification` (warning/error), `ProgressBar`, `Table*`, `Popover`/`PopoverContent`, `ContainedList`/`ContainedListItem`, `OverflowMenu`, `Modal` (danger).

Ikon (`@carbon/icons-react`): `WatsonxAi`, `RecentlyViewed`, `AddComment`, `Maximize`/`Minimize`, `Close`, `ChartBar`, `Book`, `Calculation`, `Help`, `DataAnalytics`, `ArrowUpRight`, `SearchLocate`, `FunctionMath`, `MisuseOutline`, `CheckmarkOutline`, `TriangleSolid`, `ThumbsUp(Filled)`, `ThumbsDown(Filled)`, `Renew`, `Attachment`, `Send`, `StopFilledAlt`, `Information`, `Chat`, `ArrowLeft`.

**Jalur chatbot:** komposisi `@carbon/react`. Alasannya, `@carbon/ai-chat` belum disetujui untuk dipasang dan desain Hifi memuat blok jawaban khusus (kartu capaian, formula, tabel) yang lebih mudah dikontrol dengan komposisi sendiri.

## Deviasi dari Figma (demi Carbon/PRD)

- **Ikon "neurology" (Material) diganti `WatsonxAi`.** Carbon tidak punya ikon otak, dan ikon Material dilarang oleh panduan.
- **AI label juga ditampilkan di setiap pesan bot** (ukuran `mini`), bukan hanya di judul panel. Ini mengikuti aturan Carbon for AI dan panduan slicing.
- **Tombol lampiran nonaktif** dengan label "segera hadir", karena upload dokumen di chat tidak termasuk PRD v1.0 (upload hanya lewat modul admin).
- **Riwayat percakapan dan tampilan "diperbesar" belum ada di desain**, jadi disusun dari `ContainedList` dan lebar panel `min(45rem, 50vw)`.
- **Tinggi header tetap 56px** (existing), sedangkan Figma 48px. Header yang ada tidak diubah.
- **Highlight baris IKU 001 di tabel dasbor** (ada di desain) tidak dibuat, karena akan mengubah komponen dasbor yang sudah ada.
- **Versi mobile belum ada di desain.** Di bawah 672px panel menjadi layar penuh di bawah header, launcher hanya ikon, dan tombol "perbesar" disembunyikan.

## Responsif

| Lebar | Perilaku |
|---|---|
| < 672px (sm) | Panel layar penuh; launcher hanya ikon; fokus awal ke judul panel (keyboard tidak langsung muncul) |
| 672–1055px (md) | Panel 400px menimpa konten; tombol perbesar disembunyikan |
| ≥ 1056px (lg) | Panel 400px **mendorong** konten (`.app-content` menyempit); mode perbesar `min(45rem, 50vw)` |

## Data mock (titik integrasi `// DATA:`)

- `src/lib/chat-mock.ts`: seluruh isi → `POST /api/chat`, `GET /api/chat/conversations[/:id]`.
- `src/lib/chat-client.ts`: setiap fungsi punya cabang API asli yang saat ini mengarah ke endpoint yang belum ada.
- `chat-panel.tsx`: tag "Buku IKU V1" → versi dokumen aktif dari knowledge base.
- `chat-empty-state.tsx`: contoh pertanyaan → analitik pertanyaan populer (FR-15).
- **Pemilihan jawaban mock memakai kata kunci:**
  - "aee" / "iku 1" → kalkulasi AEE
  - "iku 9" / "pendapatan" → IKU 9
  - "wajib" / "pilihan" → IKU wajib/pilihan
  - "status" / "modul" → status integrasi
  - lainnya → tanpa konteks
  - kata kunci **`#error`** → mendemokan state error
- Angka AEE di mock bersifat statis. Kalkulasi asli harus memakai logika IKU di `src/lib`. Catatan untuk AI Engineer: fungsi `aggregateAee` saat ini masih berada di dalam `iku001-dashboard.tsx` dan perlu dipindah ke `src/lib` sebelum dipakai pipeline.

## Temuan teknis

1. **Aplikasi tidak mendeklarasikan token tema terang Carbon di `:root`.** Komponen Carbon tetap tampil benar karena memakai nilai fallback, tetapi `var(--cds-*)` di CSS kustom menjadi kosong di tema terang. Solusinya, fitur chat dibungkus `<Theme theme="g10">` (launcher di header gelap memakai `g100`), dan kelas zona dimuat dari `@carbon/react/scss/zone`. Halaman yang sudah ada tidak berubah.
2. **`npm run build` (Turbopack) sudah gagal sebelum perubahan ini.** Sass tidak bisa me-resolve `@use './config'` di `@carbon/styles`, kemungkinan terkait path folder yang mengandung spasi di Windows. `next build --webpack` berhasil, termasuk dengan perubahan ini. Ini perlu ditindaklanjuti AI Ops/tim.
3. **Tata letak KPI dasbor lama bertumpuk** jika area konten menyempit (< ±760px), misalnya saat panel dalam mode perbesar di layar 1440px. Ini masalah responsif komponen dasbor yang sudah ada dan tidak diubah.
4. **Tanpa `.env`/DB, modal "Pengaturan Target" wajib muncul** dan menutupi layar. Ini perilaku yang sudah ada dan tidak terkait chat.

## Verifikasi

| Cek | Hasil |
|---|---|
| `npx tsc --noEmit` | OK (0 error) |
| `npx eslint` file baru | OK (0 masalah) |
| `npm run lint` seluruh proyek | 68 masalah, **sama dengan sebelum perubahan** (semuanya kode lama); `app-shell.tsx` tetap 31 sebelum/sesudah |
| `npm run build` (Turbopack) | Gagal, sudah gagal sebelum perubahan (temuan #2) |
| `next build --webpack` | OK |
| Cek pola terlarang (lucide, hex, Tailwind, inline style) | Bersih, kecuali 1 `style` dinamis untuk posisi penanda target (nilai dari data, diberi komentar) |
| Visual desktop 1440px | OK: tertutup, empty, loading, jawaban, tanpa konteks, error, popover sitasi, diperbesar, riwayat, riwayat dimuat |
| Visual tablet 800px | OK (overlay 400px) |
| Visual mobile 390px | OK: layar penuh, empty, jawaban, tutup mengembalikan fokus ke launcher |
| A11y | `aria-expanded`/`aria-controls` pada launcher, `role="log"` + `aria-live`, label di semua `IconButton`, `aria-pressed` pada feedback, Esc menutup panel, fokus dikelola, `prefers-reduced-motion` dihormati. **Belum:** focus trap penuh di mode mobile |

Verifikasi visual dilakukan dengan `next dev --webpack` dan Edge headless (skrip CDP di luar repo).

## Lanjutan

- BE: endpoint, skema, dan sesi server pada `docs/api-requests/asisten-iku-chat.md`.
- AI Engineer: pipeline `src/lib/ai/` yang mengembalikan `ChatAnswer` (termasuk `blocks` dan `citations`).
- UI/UX: konfirmasi desain mobile, tampilan riwayat, mode diperbesar, dan pengganti ikon `WatsonxAi`.
- Tim: persetujuan `@carbon/ai-chat` (bila ingin beralih) dan perbaikan build Turbopack.
- Umpan balik dengan komentar (FR-13) dan ekspor percakapan (FR-16) belum dibuat.

# Ringkasan Progres Proyek — Asisten IKU di Dashboard DIKTI

**Per tanggal:** 1 Oktober 2026
**Kelompok:** 17, Proyek Mandiri Lintas Disiplin Ilmu
**Acuan:** `PRD_Chatbot kelompok 17.md`, catatan perubahan #1–#5 di folder ini, riwayat git

Dokumen ini merangkum progres sejauh ini. Isinya dimulai dari gambaran source code yang dipakai, dilanjutkan dengan apa saja yang sudah dikerjakan, status terhadap kebutuhan di PRD, dan pekerjaan berikutnya. Rincian tiap perubahan ada di catatan bernomor (`*_1.md` sampai `*_5.md`).

---

## 1. Ringkasan source code

### 1.1 Asal kode

Proyek ini **memperluas aplikasi yang sudah ada**, yaitu `dikti-indicator` (github.com/sugengdcahyo/dikti-indicator). Aplikasi ini adalah dasbor monitoring-evaluasi (monev) Indikator Kinerja Utama (IKU) perguruan tinggi. Basis dasbornya dibangun Sugeng D. Cahyo pada Mei–Juli 2026. Kelompok 17 menambahkan **Asisten IKU**, yaitu chatbot berbasis LLM + RAG sesuai PRD, sebagai panel di dalam dasbor tersebut.

### 1.2 Teknologi

| Lapisan | Teknologi |
|---|---|
| Framework | Next.js 16.2 (App Router, Turbopack), React 19.2, TypeScript 5 |
| UI | IBM Carbon Design System (`@carbon/react`, `@carbon/icons-react`), Sass |
| State & data fetching | Zustand (store dasbor dan store chat), SWR |
| Grafik & tabel | Recharts, TanStack Table |
| Database | PostgreSQL di Neon, diakses dengan Prisma 7 (`@prisma/adapter-pg`) |
| Sumber data IKU | Spreadsheet (Google Sheets / Excel), dibaca dengan `xlsx` |
| Deploy | Docker multi-stage (`output: "standalone"`), `docker-compose.yml` (layanan prod port 3000, dev port 3001) |

### 1.3 Struktur folder `src/`

| Folder | Isi |
|---|---|
| `app/login` | Halaman login (kredensial dan Google OAuth), daftar, lupa/reset sandi |
| `app/(main)/dashboard` | Dasbor utama: tab **Overview** dan tab per IKU (001, 002, 003, 005, 007, 009) |
| `app/(main)/data`, `app/(main)/quality` | Halaman sumber data dan ringkasan kualitas data |
| `app/api/auth/*` | API login, register, Google OAuth (start/callback), lupa & reset sandi |
| `app/api/sources`, `app/api/dashboard-connections` | API koneksi sumber data (spreadsheet) dan pemetaan sumber ke tab IKU |
| `app/api/iku-targets` | API target capaian tiap IKU per pengguna |
| `app/api/users/status` | API aktivasi/nonaktivasi akun |
| `components/dashboard` | Tampilan tiap IKU (`dashboard-iku00x-view.tsx`, `iku001-dashboard.tsx`), Overview, filter, tabel data |
| `components/layout` | `app-shell.tsx` (header, menu samping, konten), `page-header.tsx` |
| `components/chat` | **Asisten IKU** (dibuat kelompok 17): panel, launcher, daftar pesan, blok jawaban, sitasi, composer |
| `lib` | Prisma client, repo auth, parser spreadsheet, helper perhitungan IKU, konfigurasi menu dasbor, klien & mock chat, cakupan chat, mode demo |
| `store` | `dashboard-store.ts`, `chat-store.ts` |
| `types` | `chat.ts` (kontrak data chatbot), `data.ts` |
| `styles` | `_chat-layout.scss` (tata letak panel chat) |

Total sekitar 15.000 baris kode TS/TSX/SCSS di `src/`.

### 1.4 Database (Prisma)

| Tabel | Fungsi |
|---|---|
| `app_users` | Akun pengguna: kredensial atau Google, token reset sandi, status aktif |
| `data_source_connections` | Sumber data spreadsheet milik pengguna |
| `dashboard_tab_connections` | Sumber data yang dipakai tiap tab IKU |
| `iku_targets` | Target capaian per IKU per pengguna |

Sudah ada 5 migrasi (30 Mei – 6 Juli 2026). **Belum ada tabel untuk chatbot**, misalnya percakapan, pesan, feedback, dokumen, dan embedding.

---

## 2. Linimasa progres

### 2.1 Basis aplikasi dasbor (Mei – Juli 2026, Sugeng D. Cahyo)

- **Akhir Mei:** inisialisasi proyek, auth berbasis Neon, koneksi sumber data, dasbor IKU 001, Docker.
- **Awal Juni:** dasbor IKU 002 (tracer study), IKU 003 dihubungkan ke database, merek "Dashboard DIKTI".
- **Pertengahan Juni:** menu disesuaikan ke IKU wajib (1, 2, 3, 5, 7, 9), dasbor IKU 005, filter, tabel detail, ekspor, dan insight otomatis.
- **Juli:** modal pengaturan target IKU (tersimpan di database), persentase capaian di Overview, pemilihan worksheet spreadsheet, serta aktivasi/nonaktivasi akun.

### 2.2 Asisten IKU (September 2026, kelompok 17)

| # | Tanggal | Pekerjaan | Catatan |
|---|---|---|---|
| 1 | 16 Sep | **Slicing UI Asisten IKU** dari desain Figma `PMLD-CHATBOT-IKU`. Panel chat di kanan dasbor, jawaban terstruktur (kartu capaian, formula, tabel, daftar), sitasi sumber, AI label, disclaimer, feedback suka/tidak suka, responsif desktop/tablet/mobile. Data masih **mock**. | `slicing-asisten-iku_1.md` |
| 2 | 16 Sep | **Mode demo:** lewati login dan modal target wajib lewat `NEXT_PUBLIC_DEMO_MODE=true`, untuk demo tanpa database. | `mode-demo-auth_2.md` |
| 3 | 16 Sep | **Cakupan jawaban per halaman** (keputusan stakeholder). Di tab IKU 00x chatbot hanya menjawab IKU tersebut, di Overview hanya ringkasan lintas IKU. Percakapan dipisah per halaman. Pertanyaan di luar cakupan diarahkan ke halaman yang tepat. | `cakupan-chatbot-per-halaman_3.md` |
| 4 | 17 Sep | **Fitur riwayat percakapan dihapus** atas permintaan. Percakapan hanya bertahan selama sesi. | `hapus-riwayat-chat_4.md` |
| 5 | 17 Sep | **Perbaikan build Sass di Turbopack.** Error `Can't find stylesheet to import` dari paket Carbon diselesaikan dengan loader Sass kustom di `next.config.ts`. | `perbaikan-sass-turbopack_5.md` |
| – | 17 Sep | **Perbaikan login kredensial.** Tombol "Masuk Kredensial" sebelumnya tetap nonaktif saat email/sandi diisi otomatis (autofill) oleh browser. | commit `5f2eb0f` |
| – | 16–17 Sep | **Dokumen permintaan API** untuk BE dan AI Ops: endpoint `POST /api/chat`, kontrak respons, aturan cakupan wajib di server. | `docs/api-requests/asisten-iku-chat.md` |

---

## 3. Status terhadap kebutuhan fungsional PRD

Keterangan: ✅ selesai, 🟡 UI sudah ada tetapi masih mock atau sebagian, ⬜ belum dikerjakan, ➖ dibatalkan.

| FR | Kebutuhan | Status | Keterangan |
|---|---|---|---|
| FR-01 | Ingestion dokumen (PDF/DOCX/PPTX) | ⬜ | Tugas AI Engineer / AI Ops |
| FR-02 | Chunking dan embedding | ⬜ | |
| FR-03 | Vector database | ⬜ | |
| FR-04 | Antarmuka chat Bahasa Indonesia | 🟡 | UI selesai, jawaban masih mock |
| FR-05 | Retrieval semantik | ⬜ | |
| FR-06 | Jawaban grounded + peringatan bila tanpa konteks | 🟡 | State "tanpa konteks" sudah ada di UI |
| FR-07 | Sitasi sumber | 🟡 | Komponen sitasi (dokumen, versi, bab, halaman, cuplikan) siap |
| FR-08 | Menjawab definisi, kriteria, dan formula tiap IKU | 🟡 | Mock untuk IKU 001 & 009 serta definisi tiap IKU |
| FR-09 | Percakapan multi-turn | 🟡 | Thread per halaman di UI; konteks lanjutan bergantung pada LLM |
| FR-10 | Modul admin dokumen dan versi | ⬜ | |
| FR-11 | Autentikasi dan RBAC | 🟡 | Login kredensial & Google sudah ada; **peran (role) belum ada** |
| FR-12 | Riwayat percakapan | ➖ | Dihapus atas permintaan (perubahan #4) |
| FR-13 | Feedback jawaban | 🟡 | Tombol suka/tidak suka ada; komentar dan penyimpanan belum |
| FR-14 | Disclaimer otomatis | ✅ | Tampil di panel dan di jawaban |
| FR-15 | Dasbor analitik admin | ⬜ | |
| FR-16 | Ekspor percakapan PDF/Word | ⬜ | Prioritas rendah |
| FR-17 | Log audit | ⬜ | |
| FR-18 | Retrieval hibrida (dokumen + data IKU di database) | ⬜ | Kontrak `scope` dan blok `metric`/`table` sudah disiapkan |

**Kesimpulan:** sisi antarmuka (FE) chatbot sudah lengkap dan bisa didemokan dengan data mock. Sisi backend dan pipeline AI (FR-01–03, 05, 10, 15, 17, 18) belum dimulai di repo ini.

---

## 4. Cara menjalankan

1. `npm ci`
2. Buat `.env.local`. Untuk demo tanpa database, isi `NEXT_PUBLIC_DEMO_MODE=true` dan `NEXT_PUBLIC_CHAT_MOCK=true`.
3. `npm run dev`, lalu buka `http://localhost:3000`.

Jika muncul error Sass `Can't find stylesheet to import`, pastikan `next.config.ts` sudah versi terbaru (perubahan #5), hapus folder `.next`, lalu jalankan ulang. Sebagai cadangan, `npx next dev --webpack` selalu bisa dipakai.

---

## 5. Kendala dan catatan terbuka

- **Penegakan cakupan baru disimulasikan di UI.** Server wajib memvalidasi `scope` dan memfilter retrieval berdasarkan `ikuCode`.
- **Perbaikan Turbopack memakai flag `experimental` Next.** Cek ulang setiap kali Next di-upgrade.
- **Kalkulasi AEE (`aggregateAee`) masih di dalam komponen** `iku001-dashboard.tsx`. Perlu dipindah ke `src/lib` agar bisa dipakai pipeline AI (FR-18).
- **Desain yang belum dikonfirmasi UI/UX:** tampilan mobile, mode diperbesar, state "di luar cakupan", dan pengganti ikon `WatsonxAi`.
- **Halaman `/data` dan `/quality` masih memakai cakupan Overview.** Perlu keputusan stakeholder.
- **Kode lama masih punya 68 temuan ESLint.** Tidak bertambah oleh perubahan kelompok 17.

---

## 6. Rencana berikutnya

| Peran | Pekerjaan |
|---|---|
| BE | Endpoint `POST /api/chat` dan `POST` feedback sesuai `docs/api-requests/asisten-iku-chat.md`, sesi server, tabel chat di Prisma, peran pengguna (RBAC) |
| AI Engineer / AI Ops | Pipeline ingestion → chunking → embedding → vector DB, retrieval dengan filter cakupan, generasi jawaban dalam format `ChatAnswer` (blok + sitasi) |
| FE | Sambungkan ke API asli (`NEXT_PUBLIC_CHAT_MOCK=false`), focus trap mobile, modul admin dokumen (FR-10), dasbor analitik (FR-15) |
| UI/UX | Finalisasi desain mobile dan state yang belum ada di Hifi |

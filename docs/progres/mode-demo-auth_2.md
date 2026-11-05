# Mode Demo (Lewati Login & Target Wajib) — Perubahan #2

**Tanggal:** 16 September 2026
**Peran:** FE (atas permintaan untuk kebutuhan demo; area auth milik BE, perlu diinformasikan)

## Latar belakang

Selama demo, aplikasi selalu diarahkan ke `/login`, dan modal "Pengaturan Target" wajib muncul karena target tidak bisa dimuat (database belum dikonfigurasi). Proyek ini **tidak memiliki `middleware.ts`/`proxy.ts`**. Pengecekan dilakukan di klien:

1. `src/app/page.tsx` selalu mengalihkan ke `/login`.
2. `AppShell` mengalihkan ke `/login` jika `localStorage["iku-user-session"]` kosong.
3. `AppShell` memaksa modal target terbuka dan mengunci navigasi rail jika target gagal dimuat.

## Perubahan

Mode demo aktif **hanya** jika `NEXT_PUBLIC_DEMO_MODE=true`. Default-nya mati, dan logika auth asli tidak dihapus.

| File | Perubahan |
|---|---|
| `src/lib/demo-mode.ts` | baru: `DEMO_MODE`, `DEMO_USER`, `ensureDemoSession()` |
| `src/app/page.tsx` | `/` → `/dashboard` saat demo |
| `src/app/login/page.tsx` | saat demo, sesi demo dibuat lalu langsung ke dasbor |
| `src/components/layout/app-shell.tsx` | guard memakai `ensureDemoSession()` saat demo; modal target tidak dipaksa; navigasi rail tidak dikunci |
| `.env.local` (tidak di-commit) | `NEXT_PUBLIC_DEMO_MODE=true`, `NEXT_PUBLIC_CHAT_MOCK=true` |

## Cara pakai

- Aktifkan dengan `NEXT_PUBLIC_DEMO_MODE=true` di `.env.local`, lalu restart dev server.
- Matikan dengan mengubah nilainya ke `false` atau menghapus barisnya, lalu restart.
- **Jangan aktifkan di production.**

## Verifikasi

- `tsc`: OK.
- Lint: jumlah masalah pada `app-shell.tsx` + `login/page.tsx` tetap 34, sama seperti sebelum perubahan.
- `next build --webpack`: OK.
- Browser dengan profil kosong: `/` → `/dashboard`, sesi "Pengguna Demo" terbentuk, modal tidak muncul.

# Perbaikan Build Sass di Turbopack — Perubahan #5

**Tanggal:** 17 September 2026

## Gejala

`npm run dev` / `npm run build` (Turbopack, default Next 16) gagal:

```
Error: Can't find stylesheet to import.
8 │ @use './config';
  node_modules\@carbon\styles\scss\_themes.scss 8:1
```

Dengan `--webpack`, build berhasil.

## Analisis

| Dugaan | Uji | Hasil |
|---|---|---|
| `sassOptions.includePaths` bentrok | build tanpa `includePaths` | tetap gagal |
| Spasi di path folder | build dari drive `subst R:` tanpa spasi | tetap gagal |
| Resolver Turbopack untuk impor relatif | log sementara di importer `sass-loader` | **penyebab** |

Log importer (dipasang sementara, lalu dikembalikan ke aslinya) menunjukkan:

- Semua impor paket (`@carbon/react/scss/config`, `@carbon/styles/scss/config`, …) **berhasil** di-resolve.
- Semua impor **relatif di dalam paket** gagal, misalnya `./config` di `@carbon/styles/scss/_themes.scss` dan `./generated/fluid-spacing` di `@carbon/layout/scss/_spacing.scss`.

Penyebabnya, `sass-loader` bawaan Next me-resolve impor relatif lewat `this.getResolve({ preferRelative: true })`. Webpack menghormati `preferRelative`, sedangkan resolver loader Turbopack tidak, sehingga `config` dianggap nama paket npm dan tidak ditemukan. Ini masalah kompatibilitas Turbopack, bukan kesalahan kode proyek.

## Solusi

Di `next.config.ts`:

1. `experimental.turbopackUseBuiltinSass: false` mematikan konfigurasi Sass otomatis Turbopack.
2. `turbopack.rules` untuk `*.module.scss` → `*.module.css` dan `*.scss` → `*.css`. Rantai loader-nya sama dengan bawaan Next (`resolve-url-loader` + `sass-loader`), tetapi:
   - `webpackImporter: false`, sehingga Sass tidak memakai resolver bundler;
   - `sassOptions.loadPaths: [<root>/node_modules]`, sehingga paket dimuat oleh importer filesystem Sass dan impor relatif di dalamnya berjalan normal.
3. `sassOptions.includePaths` tetap dipertahankan untuk build webpack.

Tidak ada perubahan pada file `.scss` dan tidak ada patch di `node_modules`.

## Verifikasi

- `next build` (Turbopack): ✅ berhasil.
- `next build --webpack`: ✅ berhasil.
- `tsc` dan ESLint `next.config.ts`: ✅.
- CSS Modules tetap ter-hash (`chat-module-scss-module__…__launcher`).
- `next start` dari build Turbopack: header Carbon, panel Asisten IKU, dan push konten tampil benar.
- `next dev` (Turbopack) belum diuji langsung karena dev server lain sedang berjalan. Aturannya sama dengan build.

## Catatan pemeliharaan

- Solusi ini memakai flag `experimental` dan path loader internal Next (`next/dist/compiled/sass-loader`, `next/dist/build/webpack/loaders/resolve-url-loader`). **Cek ulang setiap upgrade Next.** Jika bug resolver Turbopack sudah diperbaiki, hapus `experimental.turbopackUseBuiltinSass` dan `turbopack.rules`.
- Fallback yang selalu aman: `next dev --webpack` / `next build --webpack`.

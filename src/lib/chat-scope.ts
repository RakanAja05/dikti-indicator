// Cakupan (scope) Asisten IKU per halaman dasbor.
// Halaman IKU hanya menjawab seputar IKU tersebut; Overview menjawab ringkasan lintas IKU & konsep umum.

import { dashboardMenuItems, type MappedDashboardTab } from "@/lib/dashboard-config";
import type { ChatScope } from "@/types/chat";

/** Nama pendek untuk ruang sempit (tag, placeholder). Sumber: desain Hifi tabel Daftar Capaian IKU. */
const IKU_SHORT_TITLES: Record<MappedDashboardTab, string> = {
  "IKU 001": "Angka Efisiensi Edukasi",
  "IKU 002": "Lulusan bekerja/studi lanjut/berwirausaha",
  "IKU 003": "Mahasiswa berkegiatan di luar prodi",
  "IKU 005": "Luaran kerja sama PT & mitra",
  "IKU 007": "Keterlibatan PT dalam SDGs",
  "IKU 009": "Pendapatan non pendidikan/UKT",
};

export const OVERVIEW_SCOPE: ChatScope = {
  id: "overview",
  kind: "overview",
  label: "Overview",
  title: "Ringkasan capaian Monev IKU",
};

export function isIkuTab(tab: string): tab is MappedDashboardTab {
  return tab in IKU_SHORT_TITLES;
}

export function scopeForTab(tab: string): ChatScope {
  if (!isIkuTab(tab)) return OVERVIEW_SCOPE;
  return { id: tab, kind: "iku", ikuCode: tab, label: tab, title: IKU_SHORT_TITLES[tab] };
}

/** Halaman selain dasbor (sumber data, kualitas data) memakai cakupan Overview. */
export function scopeForLocation(pathname: string, activeDashboardTab: string): ChatScope {
  if (pathname !== "/dashboard") return OVERVIEW_SCOPE;
  return dashboardMenuItems.some((item) => item === activeDashboardTab) ? scopeForTab(activeDashboardTab) : OVERVIEW_SCOPE;
}

/** Normalisasi penyebutan IKU di teks: "IKU 1", "iku-9", "IKU 009" → "IKU 001"/"IKU 009". */
export function findMentionedIku(text: string): string | undefined {
  const match = text.match(/\biku[\s-]*0*(\d{1,2})\b/i);
  return match ? `IKU ${match[1].padStart(3, "0")}` : undefined;
}

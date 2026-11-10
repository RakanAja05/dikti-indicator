// Data mock Asisten IKU untuk tahap slicing.
// DATA: seluruh isi file ini diganti respons POST /api/chat (API NOT FOUND).
// Pembatasan cakupan di sini hanya simulasi UI; penegakan sebenarnya WAJIB di server (retrieval difilter per IKU).
// Angka AEE di bawah adalah contoh statis; kalkulasi asli wajib memakai logika IKU di src/lib (bukan di sini).

import { ikuDashboardDetails } from "@/lib/dashboard-config";
import { findMentionedIku, isIkuTab, scopeForTab } from "@/lib/chat-scope";
import type { ChatAnswer, ChatScopeRef, StarterPrompt } from "@/types/chat";

export const CHAT_DISCLAIMER = "Dibuat AI dari Buku IKU V1 & data modul. Periksa sebelum pelaporan.";

// ------------------------------------------------------------
// Contoh pertanyaan per cakupan
// ------------------------------------------------------------

const AEE_QUESTION = "Hitung capaian AEE PT kami. Realisasi: D3 30%, D4 20%, S1 20%, S2 45%, S3 30%.";
const IKU9_QUESTION = "Pendapatan apa saja yang tidak dihitung di IKU 9?";

const overviewPrompts: StarterPrompt[] = [
  { id: "ov-status", title: "Ringkas status integrasi semua IKU", question: "Ringkas status integrasi semua IKU.", category: "data-modul" },
  { id: "ov-target", title: "IKU mana yang belum mencapai target?", question: "IKU mana yang belum mencapai target?", category: "data-modul" },
  { id: "ov-wajib", title: "Apa beda IKU wajib dan pilihan?", question: "Apa beda IKU wajib dan pilihan?", category: "tanya-jawab" },
  { id: "ov-konsep", title: "Bagaimana capaian IKU dihitung secara umum?", question: "Bagaimana capaian IKU dihitung secara umum?", category: "tanya-jawab" },
];

function ikuPrompts(code: string): StarterPrompt[] {
  const prompts: StarterPrompt[] = [
    { id: `${code}-def`, title: `Apa definisi dan kriteria ${code}?`, question: `Apa definisi dan kriteria ${code}?`, category: "tanya-jawab" },
    { id: `${code}-data`, title: `Ringkas status data ${code}`, question: `Ringkas status data ${code}.`, category: "data-modul" },
  ];
  if (code === "IKU 001") {
    prompts.unshift({ id: "aee", title: "Hitung capaian AEE", question: AEE_QUESTION, category: "kalkulasi" });
  } else if (code === "IKU 002") {
    prompts.unshift({
      id: "tracer",
      title: "Simulasikan dari tracer study",
      question: "Simulasikan capaian IKU 002 dari hasil tracer study lulusan tahun lalu.",
      category: "kalkulasi",
    });
  } else if (code === "IKU 009") {
    prompts.unshift({ id: "iku9-excl", title: "Pendapatan apa yang tidak dihitung?", question: IKU9_QUESTION, category: "tanya-jawab" });
  } else {
    prompts.unshift({
      id: `${code}-hitung`,
      title: `Bagaimana cara menghitung ${code}?`,
      question: `Bagaimana cara menghitung capaian ${code}?`,
      category: "kalkulasi",
    });
  }
  return prompts;
}

export function getStarterPrompts(scope: ChatScopeRef): StarterPrompt[] {
  return scope.kind === "iku" && scope.ikuCode ? ikuPrompts(scope.ikuCode) : overviewPrompts;
}

// ------------------------------------------------------------
// Jawaban mock
// ------------------------------------------------------------

type MockAnswer = Omit<ChatAnswer, "conversationId" | "messageId" | "disclaimer"> & {
  statusText: string;
};

const IKU_PAGES: Record<string, number> = {
  "IKU 001": 45,
  "IKU 002": 52,
  "IKU 003": 60,
  "IKU 005": 71,
  "IKU 007": 80,
  "IKU 009": 88,
};

const aeeAnswer: MockAnswer = {
  statusText: "Mencari di Buku IKU · Bab V, IKU 1…",
  answer:
    "Mengacu IKU 1 – Angka Efisiensi Edukasi (AEE), capaian dihitung per jenjang terhadap AEE ideal, lalu dirata-ratakan.",
  grounded: true,
  confidence: "tinggi",
  blocks: [
    { type: "metric", label: "Capaian AEE PT", value: 86.36, target: 80, caption: "Rata-rata dari 5 jenjang" },
    { type: "formula", lines: ["Capaian_i = AEE realisasi ÷ AEE ideal × 100%", "AEE PT    = Σ Capaian_i ÷ n"] },
    {
      type: "table",
      columns: [
        { key: "jenjang", header: "Jenjang" },
        { key: "ideal", header: "Ideal", align: "end" },
        { key: "realisasi", header: "Realisasi", align: "end" },
        { key: "capaian", header: "Capaian", align: "end", emphasis: true },
      ],
      rows: [
        { jenjang: "D3", ideal: "33%", realisasi: "30%", capaian: "90,91%" },
        { jenjang: "D4", ideal: "25%", realisasi: "20%", capaian: "80,00%" },
        { jenjang: "S1", ideal: "25%", realisasi: "20%", capaian: "80,00%" },
        { jenjang: "S2", ideal: "50%", realisasi: "45%", capaian: "90,00%" },
        { jenjang: "S3", ideal: "33%", realisasi: "30%", capaian: "90,91%" },
      ],
    },
    {
      type: "note",
      text: "Catatan: mahasiswa pindah, drop out, dan cuti melebihi ketentuan tidak dimasukkan dalam perhitungan.",
    },
  ],
  citations: [
    {
      id: "c-aee-1",
      documentTitle: "Buku IKU Diktisaintek Berdampak",
      documentVersion: "V1",
      section: "IKU 1 · Formula",
      page: 45,
      ikuCode: "IKU 001",
      snippet: "Capaian AEE dihitung dengan membandingkan AEE realisasi terhadap AEE ideal pada setiap jenjang…",
    },
    {
      id: "c-aee-2",
      documentTitle: "Buku IKU Diktisaintek Berdampak",
      documentVersion: "V1",
      section: "Contoh perhitungan",
      page: 46,
      ikuCode: "IKU 001",
      snippet: "Contoh: PT dengan lima jenjang pendidikan menghitung capaian tiap jenjang lalu merata-ratakannya…",
    },
  ],
  action: { label: "Buka IKU 001", dashboardTab: "IKU 001" },
};

const iku9Answer: MockAnswer = {
  statusText: "Mencari di Buku IKU · Bab V, IKU 9…",
  answer: "Mengacu IKU 9 – Pendapatan Non Pendidikan/UKT, pos berikut tidak diakui:",
  grounded: true,
  confidence: "tinggi",
  blocks: [
    {
      type: "list",
      variant: "excluded",
      items: [
        "SPP/UKT/biaya kuliah mahasiswa",
        "Iuran pengembangan institusi",
        "Subsidi langsung pemerintah (belanja pegawai, operasional, BOPTN, BPPTNBH)",
        "Sumbangan/filantropi di luar laporan keuangan resmi",
        "Dana pokok dana abadi yang disimpan permanen",
      ],
    },
    { type: "formula", lines: ["IKU 9 = Pendapatan non mahasiswa", "      ÷ Total pendapatan PT × 100%"] },
    {
      type: "note",
      text: "Syarat: tercatat di laporan keuangan teraudit (BPK untuk PTN, auditor independen untuk PTS).",
    },
  ],
  citations: [
    {
      id: "c-iku9-1",
      documentTitle: "Buku IKU Diktisaintek Berdampak",
      documentVersion: "V1",
      section: "IKU 9 · Ketentuan",
      page: 88,
      ikuCode: "IKU 009",
      snippet: "Pendapatan yang tidak diakui meliputi SPP/UKT, iuran pengembangan institusi, dan subsidi langsung pemerintah…",
    },
  ],
  action: { label: "Buka IKU 009", dashboardTab: "IKU 009" },
};

const wajibPilihanAnswer: MockAnswer = {
  statusText: "Mencari di Buku IKU · Bab V, daftar IKU…",
  answer:
    "IKU wajib harus dilaporkan oleh seluruh perguruan tinggi sesuai kontrak kinerja. IKU pilihan dipilih perguruan tinggi sesuai keunggulan dan misi institusinya, dengan jumlah minimum yang ditetapkan dalam ketentuan.",
  grounded: true,
  confidence: "sedang",
  blocks: [
    {
      type: "table",
      columns: [
        { key: "jenis", header: "Jenis" },
        { key: "sifat", header: "Sifat" },
      ],
      rows: [
        { jenis: "IKU wajib", sifat: "Dilaporkan semua PT" },
        { jenis: "IKU pilihan", sifat: "Dipilih sesuai keunggulan PT" },
        { jenis: "IKU partisipatif", sifat: "Kontribusi pada program nasional" },
      ],
    },
  ],
  citations: [
    {
      id: "c-wp-1",
      documentTitle: "Buku IKU Diktisaintek Berdampak",
      documentVersion: "V1",
      section: "Bab V · Daftar IKU",
      page: 30,
      snippet: "IKU Diktisaintek Berdampak terdiri atas IKU wajib, IKU pilihan, dan IKU partisipatif…",
    },
  ],
};

const overviewConceptAnswer: MockAnswer = {
  statusText: "Mencari di Buku IKU · Bab V…",
  answer:
    "Secara umum, capaian setiap IKU dibandingkan dengan target kontrak kinerja. Rumus rinci berbeda untuk tiap indikator; buka halaman IKU terkait untuk penjelasan dan kalkulasinya.",
  grounded: true,
  confidence: "sedang",
  blocks: [{ type: "formula", lines: ["Persentase capaian = Realisasi IKU ÷ Target IKU × 100%"] }],
  citations: [
    {
      id: "c-konsep-1",
      documentTitle: "Buku IKU Diktisaintek Berdampak",
      documentVersion: "V1",
      section: "Bab V · Ketentuan umum",
      page: 28,
      snippet: "Capaian kinerja diukur dengan membandingkan realisasi indikator terhadap target yang ditetapkan…",
    },
  ],
};

const overviewStatusAnswer: MockAnswer = {
  statusText: "Membaca data modul Monev IKU…",
  answer:
    "Saat ini 0 dari 6 indikator sudah terhubung ke sumber data. IKU 001, 002, 003, 005, 007, dan 009 masih berstatus belum terhubung, sehingga capaian terhadap target belum dapat dibandingkan.",
  grounded: true,
  confidence: "tinggi",
  blocks: [
    {
      type: "table",
      columns: [
        { key: "iku", header: "Indikator" },
        { key: "status", header: "Status sumber" },
        { key: "target", header: "Target", align: "end" },
      ],
      rows: ["IKU 001", "IKU 002", "IKU 003", "IKU 005", "IKU 007", "IKU 009"].map((iku) => ({
        iku,
        status: "Belum terhubung",
        target: "80%",
      })),
    },
    {
      type: "note",
      text: "Hubungkan sumber data melalui ikon tautan pada tabel Daftar Capaian IKU untuk mulai menghitung capaian.",
    },
  ],
  citations: [],
};

const notGroundedAnswer: MockAnswer = {
  statusText: "Mencari di Buku IKU…",
  answer:
    "Maaf, saya tidak menemukan informasi yang relevan di Buku IKU V1 maupun data modul untuk pertanyaan ini. Coba tanyakan definisi, kriteria, formula, atau capaian indikator pada halaman ini.",
  grounded: false,
  citations: [],
};

function ikuDefinitionAnswer(code: string): MockAnswer {
  const detail = isIkuTab(code) ? ikuDashboardDetails[code] : undefined;
  const scope = scopeForTab(code);
  return {
    statusText: `Mencari di Buku IKU · Bab V, ${code}…`,
    answer: `${code} – ${detail?.title ?? scope.title}. ${detail?.description ?? ""}`.trim(),
    grounded: true,
    confidence: "sedang",
    blocks: [{ type: "note", text: "Formula, kriteria rinci, dan contoh perhitungan tersedia pada sumber berikut." }],
    citations: [
      {
        id: `c-${code}-def`,
        documentTitle: "Buku IKU Diktisaintek Berdampak",
        documentVersion: "V1",
        section: `${code} · Definisi & kriteria`,
        page: IKU_PAGES[code],
        ikuCode: code,
        snippet: detail?.description ?? scope.title,
      },
    ],
  };
}

function ikuStatusAnswer(code: string): MockAnswer {
  return {
    statusText: `Membaca data modul ${code}…`,
    answer: `Sumber data ${code} belum terhubung, sehingga capaian belum dapat dihitung dari data modul. Target yang tercatat saat ini 80%.`,
    grounded: true,
    confidence: "tinggi",
    blocks: [
      { type: "note", text: `Hubungkan sumber data ${code} melalui ikon tautan pada tabel Daftar Capaian IKU.` },
    ],
    citations: [],
  };
}

function outOfScopeAnswer(scope: ChatScopeRef, suggestedTab?: string): MockAnswer {
  const current = scopeForTab(scope.id);
  const where = current.kind === "iku" ? `${current.label} – ${current.title}` : "ringkasan lintas IKU di Overview";
  const suggestion = suggestedTab ? ` Pertanyaan Anda terkait ${suggestedTab}.` : "";
  return {
    statusText: "Memeriksa cakupan pertanyaan…",
    answer: `Di halaman ini saya hanya menjawab seputar ${where}.${suggestion}`,
    grounded: true,
    citations: [],
    outOfScope: { suggestedTab },
  };
}

/** Topik khas tiap IKU, untuk mendeteksi pertanyaan lintas halaman tanpa menyebut nomor IKU. */
const TOPIC_KEYWORDS: [RegExp, string][] = [
  [/\baee\b|efisiensi edukasi/i, "IKU 001"],
  [/tracer|lulusan/i, "IKU 002"],
  [/mbkm|luar prodi|luar program studi/i, "IKU 003"],
  [/kerja ?sama|start-?up|industri/i, "IKU 005"],
  [/\bsdgs?\b/i, "IKU 007"],
  [/pendapatan|\bukt\b/i, "IKU 009"],
];

const IN_SCOPE_HINT = /definisi|kriteria|ketentuan|formula|rumus|hitung|capaian|target|cara|jelaskan|apa itu|sumber data|status|data/i;

function detectIku(question: string): string | undefined {
  return findMentionedIku(question) ?? TOPIC_KEYWORDS.find(([pattern]) => pattern.test(question))?.[1];
}

/** Pilih jawaban mock berdasarkan cakupan halaman dan kata kunci pertanyaan. */
export function pickMockAnswer(question: string, scope: ChatScopeRef): MockAnswer {
  const q = question.toLowerCase();
  const mentioned = detectIku(question);

  if (scope.kind === "overview") {
    if (/wajib|pilihan|partisipatif/.test(q)) return wajibPilihanAnswer;
    if (/status|integrasi|ringkas|target|belum/.test(q)) return overviewStatusAnswer;
    if (mentioned) return outOfScopeAnswer(scope, mentioned);
    if (/umum|dihitung|capaian/.test(q)) return overviewConceptAnswer;
    return notGroundedAnswer;
  }

  const code = scope.ikuCode ?? scope.id;
  if (mentioned && mentioned !== code) return outOfScopeAnswer(scope, mentioned);
  if (/wajib|pilihan|partisipatif/.test(q)) return outOfScopeAnswer(scope, "Overview");

  if (code === "IKU 001" && /hitung|realisasi|aee/.test(q)) return aeeAnswer;
  if (code === "IKU 009" && /tidak (dihitung|diakui)|pendapatan apa/.test(q)) return iku9Answer;
  if (/status|terhubung|data/.test(q)) return ikuStatusAnswer(code);
  if (mentioned === code || IN_SCOPE_HINT.test(q)) return ikuDefinitionAnswer(code);
  return notGroundedAnswer;
}

/** Kata kunci untuk mendemokan state error di mode mock. */
export const MOCK_ERROR_KEYWORD = "#error";

// Mode demo: melewati pengecekan login & wajib-isi target IKU selama presentasi.
// Aktif hanya jika NEXT_PUBLIC_DEMO_MODE=true (default mati). Jangan aktifkan di production.

export const DEMO_MODE = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

const SESSION_KEY = "iku-user-session";

export const DEMO_USER = {
  name: "Pengguna Demo",
  email: "demo@dikti-indicator.local",
  avatarUrl: "",
  provider: "credentials",
} as const;

/** Pastikan ada sesi lokal saat mode demo; kembalikan JSON sesi yang aktif. */
export function ensureDemoSession(): string {
  const existing = localStorage.getItem(SESSION_KEY);
  if (existing) return existing;
  const session = JSON.stringify(DEMO_USER);
  localStorage.setItem(SESSION_KEY, session);
  return session;
}

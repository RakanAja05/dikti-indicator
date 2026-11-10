"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  TextInput,
  PasswordInput,
  Button,
  InlineNotification,
  Loading,
  Modal
} from "@carbon/react";
import {
  ArrowRight
} from "@carbon/icons-react";
import { DEMO_MODE, ensureDemoSession } from "@/lib/demo-mode";

function parseCookie(name: string): string | null {
  const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = document.cookie.match(new RegExp(`(?:^|; )${escaped}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

const GoogleIcon = (props: any) => (
  <svg viewBox="0 0 24 24" width="16" height="16" {...props} style={{ fill: "none", flexShrink: 0 }}>
    <path
      fill="#EA4335"
      d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3C17.782 1.145 15.055 0 12 0 7.336 0 3.336 2.682 1.336 6.59l3.93 3.175z"
    />
    <path
      fill="#FBBC05"
      d="M1.336 6.59A11.968 11.968 0 0 0 0 12c0 1.927.455 3.755 1.255 5.373l4.01-3.11c-.246-.7-.382-1.464-.382-2.263 0-.827.145-1.618.41-2.318l-3.957-3.1z"
    />
    <path
      fill="#4285F4"
      d="M12 24c3.245 0 5.973-1.073 7.964-2.918l-3.864-3c-1.127.755-2.564 1.209-4.1 1.209-3.155 0-5.836-2.127-6.782-5.018l-4.01 3.11C3.218 21.236 7.218 24 12 24z"
    />
    <path
      fill="#34A853"
      d="M24 12c0-.827-.073-1.627-.218-2.4H12v4.8h6.727c-.29 1.555-1.173 2.873-2.49 3.755l3.864 3C22.364 19.31 24 16 24 12z"
    />
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  
  // Navigation View State
  const [view, setView] = useState<"login" | "register" | "forgot-password">("login");

  // Login States
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isGoogleLoading, setIsGoogleLoading] = useState(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("google_auth") === "success";
    }
    return false;
  });

  // Register States
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regConfirmPassword, setRegConfirmPassword] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);

  // Forgot Password States
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState(false);
  const [forgotDebugToken, setForgotDebugToken] = useState<string | null>(null);

  // General Loading & Error States
  const [isLoading, setIsLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);


  // Protect routes and sync user session on mount / OAuth callback
  useEffect(() => {
    // 1. Check if already logged in (mode demo: langsung buat sesi demo)
    const rawUser = DEMO_MODE ? ensureDemoSession() : localStorage.getItem("iku-user-session");
    if (rawUser) {
      router.push("/dashboard");
      return;
    }

    // 2. Parse OAuth callback result from server-side flow
    const params = new URLSearchParams(window.location.search);
    const authStatus = params.get("google_auth");
    const authError = params.get("error");

    if (authStatus === "success") {
      const rawSession = parseCookie("iku_oauth_session");
      if (!rawSession) {
        setAuthError("Sesi login Google tidak ditemukan. Silakan coba lagi.");
        setIsGoogleLoading(false);
        return;
      }

      try {
        localStorage.setItem("iku-user-session", rawSession);
        document.cookie = "iku_oauth_session=; Max-Age=0; path=/";
        router.replace("/dashboard");
      } catch (err) {
        console.error("Google Auth error:", err);
        setAuthError("Gagal memproses sesi login Google.");
        setIsGoogleLoading(false);
      }
      return;
    }

    if (authStatus === "error") {
      setIsGoogleLoading(false);
      setAuthError(authError ? decodeURIComponent(authError) : "Login Google gagal. Silakan coba lagi.");
      router.replace("/login");
    }
  }, [router]);

  const handleCredentialsLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Baca langsung dari form: nilai autofill browser belum tentu masuk ke state React.
    const form = new FormData(e.currentTarget);
    const email = String(form.get("email") ?? "");
    const password = String(form.get("password") ?? "");
    setEmail(email);
    setPassword(password);
    if (!email.trim() || !password.trim()) {
      setAuthError("Email dan password wajib diisi.");
      return;
    }
    
    setIsLoading(true);
    setAuthError(null);

    try {
      const resp = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          password: password.trim()
        })
      });

      const json = await resp.json();
      if (!resp.ok) {
        setAuthError(json.error || "Email atau sandi institusi salah.");
        setIsLoading(false);
        return;
      }

      localStorage.setItem("iku-user-session", JSON.stringify(json.user));
      router.push("/dashboard");
    } catch (error) {
      console.error("Login credentials error:", error);
      setAuthError("Gagal menghubungkan login ke server.");
      setIsLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regName.trim() || !regEmail.trim() || !regPassword.trim() || !regConfirmPassword.trim()) {
      setAuthError("Semua kolom pendaftaran wajib diisi.");
      return;
    }
    if (regPassword !== regConfirmPassword) {
      setAuthError("Konfirmasi kata sandi tidak cocok.");
      return;
    }
    if (regPassword.length < 6) {
      setAuthError("Kata sandi harus minimal 6 karakter.");
      return;
    }
    
    setIsLoading(true);
    setAuthError(null);

    try {
      const resp = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: regName.trim(),
          email: regEmail.trim(),
          password: regPassword.trim(),
          confirmPassword: regConfirmPassword.trim()
        })
      });

      const json = await resp.json();
      if (!resp.ok) {
        setAuthError(json.error || "Gagal menyimpan pendaftaran.");
        setIsLoading(false);
        return;
      }

      setRegSuccess(true);
      setIsLoading(false);
      setRegName("");
      setRegEmail("");
      setRegPassword("");
      setRegConfirmPassword("");
      
      // Automatically navigate back to login view after 2.5 seconds
      setTimeout(() => {
        setView("login");
        setRegSuccess(false);
      }, 2500);
    } catch (error) {
      console.error("Register error:", error);
      setAuthError("Gagal menghubungkan pendaftaran ke server.");
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setAuthError("Email institusi wajib diisi.");
      return;
    }

    setIsLoading(true);
    setAuthError(null);

    try {
      const resp = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: forgotEmail.trim() })
      });

      const json = await resp.json();
      if (!resp.ok) {
        setAuthError(json.error || "Gagal mengirim permintaan reset password.");
        setIsLoading(false);
        return;
      }

      setForgotSuccess(true);
      setForgotDebugToken(json.debugResetToken || null);
      setIsLoading(false);
      setForgotEmail("");
    } catch (error) {
      console.error("Forgot password error:", error);
      setAuthError("Gagal menghubungkan reset password ke server.");
      setIsLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    setIsGoogleLoading(true);
    setAuthError(null);
    window.location.href = "/api/auth/google/start";
  };

  return (
    <main style={{ display: "flex", width: "100vw", height: "100vh", overflow: "hidden", background: "var(--cds-background, #f4f4f4)" }}>
      {(isLoading || isGoogleLoading) && (
        <Loading
          withOverlay={true}
          description={isGoogleLoading ? "Menghubungkan Akun Google..." : "Memverifikasi kredensial..."}
        />
      )}

      {/* Left Pane: Brand & Value Prop (Carbon Dark Theme 40%) */}
      <section style={{
        width: "40%",
        height: "100%",
        backgroundColor: "#161616",
        borderRight: "1px solid #393939",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "3rem",
        boxSizing: "border-box",
        color: "#ffffff"
      }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "2.5rem" }}>
          <div>
            <h1 style={{ fontSize: "1.75rem", fontWeight: 600, letterSpacing: "0.02em", color: "#ffffff", margin: "0 0 0.5rem 0" }}>
              Monev <span style={{ color: "#8d8d8d", fontWeight: 400 }}>IKU</span>
            </h1>
            <p style={{ fontSize: "0.875rem", color: "#c6c6c6", margin: 0, fontWeight: 500 }}>
              Platform Integrasi Data dan Analisis Kinerja Utama
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "1.75rem", marginTop: "1rem" }}>
            <div style={{ borderLeft: "3px solid #0f62fe", paddingLeft: "1rem" }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#ffffff", margin: "0 0 0.25rem 0" }}>
                Koneksi Instan Google Drive
              </p>
              <p style={{ fontSize: "0.75rem", color: "#a8a8a8", margin: 0, lineHeight: "1.4" }}>
                Sinkronisasi folder Drive dan spreadsheet secara real-time untuk pemantauan serta konsolidasi data otomatis.
              </p>
            </div>
            <div style={{ borderLeft: "3px solid #198038", paddingLeft: "1rem" }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#ffffff", margin: "0 0 0.25rem 0" }}>
                Validasi Skema &amp; Integritas Data
              </p>
              <p style={{ fontSize: "0.75rem", color: "#a8a8a8", margin: 0, lineHeight: "1.4" }}>
                Mendeteksi tipe data, validitas nilai, duplikasi baris, serta kepatuhan struktur tabel secara instan.
              </p>
            </div>
            <div style={{ borderLeft: "3px solid #8a3ffc", paddingLeft: "1rem" }}>
              <p style={{ fontSize: "0.8125rem", fontWeight: 600, color: "#ffffff", margin: "0 0 0.25rem 0" }}>
                Visualisasi Standar CDS
              </p>
              <p style={{ fontSize: "0.75rem", color: "#a8a8a8", margin: 0, lineHeight: "1.4" }}>
                Grafik interaktif yang dipadukan dengan modul KPI terintegrasi, tabel komparatif, serta rekomendasi berbasis data.
              </p>
            </div>
          </div>
        </div>

        <div>
          <p style={{ fontSize: "0.6875rem", color: "#8d8d8d", margin: 0, letterSpacing: "0.02em" }}>
            Monev Analytics • Didukung oleh IBM Carbon Design System
          </p>
        </div>
      </section>

      {/* Right Pane: Auth Forms (White/Grey Theme 60%) */}
      <section style={{
        width: "60%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "2rem 4rem",
        boxSizing: "border-box",
        overflowY: "auto"
      }}>
        <div style={{ width: "100%", maxWidth: "400px", display: "flex", flexDirection: "column", gap: "2rem" }}>
          
          {view === "login" && (
            <>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 400, color: "var(--cds-text-primary, #161616)", margin: "0 0 0.5rem 0" }}>
                  Masuk Ke Akun Anda
                </h2>
                <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)", margin: 0, lineHeight: "1.4" }}>
                  Gunakan akun institusi Anda untuk mengakses sistem workstation analisis data secara komprehensif.
                </p>
              </div>

              <form onSubmit={handleCredentialsLogin} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <TextInput
                  id="auth-email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  labelText="Email Institusi"
                  placeholder="nama@univ.ac.id"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                  style={{ borderRadius: 0 }}
                />
                <PasswordInput
                  id="auth-password"
                  name="password"
                  autoComplete="current-password"
                  labelText="Kata Sandi"
                  placeholder="Masukkan sandi Anda"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isLoading || isGoogleLoading}
                  style={{ borderRadius: 0 }}
                />

                {authError && (
                  <InlineNotification
                    kind="error"
                    title="Gagal autentikasi"
                    subtitle={authError}
                    lowContrast
                    hideCloseButton
                    style={{ margin: "0.5rem 0 0 0", width: "100%" }}
                  />
                )}

                <Button
                  type="submit"
                  renderIcon={ArrowRight}
                  disabled={isLoading || isGoogleLoading}
                  style={{ width: "100%", marginTop: "0.5rem", borderRadius: 0, paddingRight: "1.5rem" }}
                >
                  {isLoading ? "Memverifikasi…" : "Masuk Kredensial"}
                </Button>
              </form>

              {/* Toggles for Register / Forgot Password */}
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem", marginTop: "-0.5rem" }}>
                <button
                  type="button"
                  onClick={() => { setView("forgot-password"); setAuthError(null); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--cds-link-primary, #0f62fe)",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "inherit",
                    textDecoration: "underline"
                  }}
                >
                  Lupa kata sandi?
                </button>
                <button
                  type="button"
                  onClick={() => { setView("register"); setAuthError(null); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--cds-link-primary, #0f62fe)",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "inherit",
                    textDecoration: "underline"
                  }}
                >
                  Belum punya akun? Daftar Baru
                </button>
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: "1rem", margin: "0.5rem 0" }}>
                <span style={{ flex: 1, height: "1px", backgroundColor: "var(--cds-border-subtle-00, #e0e0e0)" }} />
                <span style={{ fontSize: "0.6875rem", color: "var(--cds-text-helper, #6f6f6f)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                  Atau sambungkan
                </span>
                <span style={{ flex: 1, height: "1px", backgroundColor: "var(--cds-border-subtle-00, #e0e0e0)" }} />
              </div>

              {/* Google OAuth Button (Standard IBM/CDS Tertiary Button) */}
              <Button
                type="button"
                kind="tertiary"
                onClick={handleGoogleLogin}
                disabled={isLoading || isGoogleLoading}
                renderIcon={GoogleIcon}
                style={{
                  width: "100%",
                  marginTop: "0.5rem",
                  borderRadius: 0,
                  paddingRight: "1.5rem"
                }}
              >
                Sambungkan Google Workspace
              </Button>
            </>
          )}

          {view === "register" && (
            <>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 400, color: "var(--cds-text-primary, #161616)", margin: "0 0 0.5rem 0" }}>
                  Daftar Akun Baru
                </h2>
                <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)", margin: 0, lineHeight: "1.4" }}>
                  Buat akun alternatif jika Anda belum terhubung dengan sistem integrasi masuk tunggal.
                </p>
              </div>

              <form onSubmit={handleRegister} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <TextInput
                  id="reg-name"
                  labelText="Nama Lengkap"
                  placeholder="Nama Lengkap Anda"
                  value={regName}
                  onChange={(e) => setRegName(e.target.value)}
                  disabled={isLoading || isGoogleLoading || regSuccess}
                  style={{ borderRadius: 0 }}
                />
                <TextInput
                  id="reg-email"
                  labelText="Email Institusi"
                  placeholder="nama@univ.ac.id"
                  value={regEmail}
                  onChange={(e) => setRegEmail(e.target.value)}
                  disabled={isLoading || isGoogleLoading || regSuccess}
                  style={{ borderRadius: 0 }}
                />
                <PasswordInput
                  id="reg-password"
                  labelText="Kata Sandi"
                  placeholder="Masukkan sandi minimal 6 karakter"
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  disabled={isLoading || isGoogleLoading || regSuccess}
                  style={{ borderRadius: 0 }}
                />
                <PasswordInput
                  id="reg-confirm-password"
                  labelText="Konfirmasi Kata Sandi"
                  placeholder="Masukkan kembali sandi Anda"
                  value={regConfirmPassword}
                  onChange={(e) => setRegConfirmPassword(e.target.value)}
                  disabled={isLoading || isGoogleLoading || regSuccess}
                  style={{ borderRadius: 0 }}
                />

                {authError && (
                  <InlineNotification
                    kind="error"
                    title="Gagal pendaftaran"
                    subtitle={authError}
                    lowContrast
                    hideCloseButton
                    style={{ margin: "0.5rem 0 0 0", width: "100%" }}
                  />
                )}

                {regSuccess && (
                  <InlineNotification
                    kind="success"
                    title="Registrasi Berhasil"
                    subtitle="Akun Anda berhasil didaftarkan. Mengalihkan ke halaman login..."
                    lowContrast
                    hideCloseButton
                    style={{ margin: "0.5rem 0 0 0", width: "100%" }}
                  />
                )}

                <Button
                  type="submit"
                  renderIcon={ArrowRight}
                  disabled={isLoading || isGoogleLoading || regSuccess || !regName || !regEmail || !regPassword || !regConfirmPassword}
                  style={{ width: "100%", marginTop: "0.5rem", borderRadius: 0, paddingRight: "1.5rem" }}
                >
                  Daftar Akun
                </Button>
              </form>

              <div style={{ display: "flex", justifyContent: "center", fontSize: "0.8125rem", marginTop: "-0.5rem" }}>
                <button
                  type="button"
                  onClick={() => { setView("login"); setAuthError(null); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--cds-link-primary, #0f62fe)",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "inherit",
                    textDecoration: "underline"
                  }}
                >
                  Kembali ke Halaman Login
                </button>
              </div>
            </>
          )}

          {view === "forgot-password" && (
            <>
              <div>
                <h2 style={{ fontSize: "1.5rem", fontWeight: 400, color: "var(--cds-text-primary, #161616)", margin: "0 0 0.5rem 0" }}>
                  Atur Ulang Kata Sandi
                </h2>
                <p style={{ fontSize: "0.875rem", color: "var(--cds-text-secondary, #525252)", margin: 0, lineHeight: "1.4" }}>
                  Masukkan email institusi Anda yang terdaftar untuk menerima tautan instruksi atur ulang kata sandi.
                </p>
              </div>

              <form onSubmit={handleForgotPassword} style={{ display: "flex", flexDirection: "column", gap: "1.25rem" }}>
                <TextInput
                  id="forgot-email"
                  labelText="Email Institusi"
                  placeholder="nama@univ.ac.id"
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  disabled={isLoading || isGoogleLoading || forgotSuccess}
                  style={{ borderRadius: 0 }}
                />

                {authError && (
                  <InlineNotification
                    kind="error"
                    title="Gagal memproses"
                    subtitle={authError}
                    lowContrast
                    hideCloseButton
                    style={{ margin: "0.5rem 0 0 0", width: "100%" }}
                  />
                )}

                {forgotSuccess && (
                  <InlineNotification
                    kind="success"
                    title="Tautan Terkirim"
                    subtitle="Tautan pemulihan sandi telah dikirim ke email institusi Anda."
                    lowContrast
                    hideCloseButton
                    style={{ margin: "0.5rem 0 0 0", width: "100%" }}
                  />
                )}
                {forgotSuccess && forgotDebugToken && (
                  <InlineNotification
                    kind="info"
                    title="Debug Token (Dev)"
                    subtitle={`Gunakan token ini ke endpoint /api/auth/password/reset: ${forgotDebugToken}`}
                    lowContrast
                    hideCloseButton
                    style={{ margin: "0.25rem 0 0 0", width: "100%" }}
                  />
                )}

                <Button
                  type="submit"
                  renderIcon={ArrowRight}
                  disabled={isLoading || isGoogleLoading || forgotSuccess || !forgotEmail}
                  style={{ width: "100%", marginTop: "0.5rem", borderRadius: 0, paddingRight: "1.5rem" }}
                >
                  Kirim Tautan Atur Ulang
                </Button>
              </form>

              <div style={{ display: "flex", justifyContent: "center", fontSize: "0.8125rem", marginTop: "-0.5rem" }}>
                <button
                  type="button"
                  onClick={() => { setView("login"); setAuthError(null); setForgotSuccess(false); }}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--cds-link-primary, #0f62fe)",
                    cursor: "pointer",
                    padding: 0,
                    fontFamily: "inherit",
                    textDecoration: "underline"
                  }}
                >
                  Kembali ke Halaman Login
                </button>
              </div>
            </>
          )}

        </div>
      </section>

    </main>
  );
}

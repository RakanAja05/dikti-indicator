import { prisma } from "@/lib/prisma";
import type { AuthResult } from "@/lib/chat/types";

/**
 * PLACEHOLDER — mekanisme auth asli project ini belum dikonfirmasi.
 * Endpoint existing lain (sources, iku-targets) menerima `userEmail`
 * mentah tanpa verifikasi session sama sekali; belum diketahui apakah
 * src/app/api/auth/login/route.ts menyetel cookie/session.
 *
 * Untuk sekarang, fungsi ini membaca email dari header `x-user-email`
 * sebagai jembatan sementara SUPAYA route.ts dan chat-service bisa
 * ditest end-to-end tanpa menunggu keputusan session final. Ini BUKAN
 * mekanisme auth yang aman untuk production.
 *
 * TODO: ganti isi fungsi ini begitu mekanisme session/cookie yang
 * sebenarnya dikonfirmasi (mis. baca cookie session, verifikasi JWT, dsb).
 * Signature `(request: Request) => Promise<AuthResult>` TIDAK perlu
 * berubah — pemanggil (route.ts) tidak bergantung pada detail di dalamnya.
 */
export async function getAuthenticatedUser(request: Request): Promise<AuthResult> {
  const email = request.headers.get("x-user-email")?.trim().toLowerCase();

  if (!email) {
    return { status: "unauthenticated" };
  }

  const user = await prisma.appUser.findUnique({ where: { email } });

  if (!user) {
    return { status: "unauthenticated" };
  }

  if (!user.isActive) {
    return { status: "inactive" };
  }

  return { status: "ok", user: { email: user.email } };
}
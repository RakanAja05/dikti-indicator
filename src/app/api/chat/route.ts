import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/chat/auth-context";
import { handleChatMessage } from "@/lib/chat/chat-service-rag";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const auth = await getAuthenticatedUser(request);

    if (auth.status === "unauthenticated") {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    if (auth.status === "inactive") {
      return NextResponse.json(
        { error: "Akun Anda telah dinonaktifkan. Silakan hubungi admin." },
        { status: 403 }
      );
    }

    const body = (await request.json()) as {
      message?: string;
      scope?: { kind?: string; ikuCode?: string };
    };
    const message = (body.message || "").trim();
    const scope = body.scope;

    if (!message) {
      return NextResponse.json({ error: "message wajib diisi." }, { status: 400 });
    }

    const result = await handleChatMessage(
      { email: auth.user.email },
      message,
      (scope?.kind === "iku" || scope?.kind === "overview")
        ? { kind: scope.kind, ikuCode: scope.ikuCode }
        : undefined
    );

    return NextResponse.json(result);
  } catch (error: unknown) {
    // Structured error logging untuk diagnosa koneksi ke RAG service
    console.error("Chat API error:", error instanceof Error ? error.message : String(error));

    // Ekstrak detail error jaringan dari undici / Node.js fetch
    if (error instanceof Error && "cause" in error && error.cause) {
      const cause = error.cause as Record<string, unknown>;
      console.error("Network error details:", {
        code: cause.code,
        errno: cause.errno,
        syscall: cause.syscall,
        address: cause.address,
        port: cause.port,
      });
    }

    return NextResponse.json({ error: "Gagal memproses chat." }, { status: 500 });
  }
}
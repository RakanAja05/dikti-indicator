import { NextResponse } from "next/server";
import { getAuthenticatedUser } from "@/lib/chat/auth-context";
import { handleChatMessage } from "@/lib/chat/chat-service";

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

    const body = (await request.json()) as { message?: string };
    const message = (body.message || "").trim();

    if (!message) {
      return NextResponse.json({ error: "message wajib diisi." }, { status: 400 });
    }

    const result = await handleChatMessage(auth.user, message);
    return NextResponse.json(result);
  } catch (error) {
    console.error("POST /api/chat error:", error);
    return NextResponse.json({ error: "Gagal memproses chat." }, { status: 500 });
  }
}
// Shared types untuk fitur chat.
// File ini sengaja terpisah karena dipakai bersama oleh route.ts,
// chat-service.ts, qwen-client.ts, auth-context.ts, dan spreadsheet-tool.ts.

export type AuthContext = {
  email: string;
};

export type AuthResult =
  | { status: "ok"; user: AuthContext }
  | { status: "unauthenticated" }
  | { status: "inactive" };

export type QwenMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type SpreadsheetToolResult =
  | {
      status: "ok";
      source: { id: string; name: string };
      columns: string[];
      rows: Record<string, unknown>[];
      truncated: boolean;
    }
  | { status: "no_source"; message: string }
  | { status: "error"; message: string };

export type ParsedQwenResponse =
  | { type: "answer"; content: string }
  | { type: "needsData"; query: string };
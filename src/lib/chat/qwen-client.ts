import type { QwenMessage } from "@/lib/chat/types";
import { LlmTimeoutError, LlmUnavailableError, LlmBadResponseError } from "@/lib/chat/types";
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd());

export interface QwenClient {
  chat(messages: QwenMessage[]): Promise<string>;
  healthCheck?(): Promise<boolean>;
}

// Env vars - tidak throw saat build (hanya throw saat digunakan)
const getEnvOrUndefined = (name: string): string | undefined => {
  const value = process.env[name];
  if (value && value.trim() !== "") {
    return value.trim();
  }
  return undefined;
};

const getEnvOrThrow = (name: string): string => {
  const value = getEnvOrUndefined(name);
  if (!value) {
    throw new Error(`Environment variable ${name} is required`);
  }
  return value;
};

const DEFAULT_TIMEOUT_MS = parseInt(process.env.LLM_TIMEOUT_MS ?? "30000", 10);
const DEFAULT_MAX_RETRIES = parseInt(process.env.LLM_MAX_RETRIES ?? "2", 10);
const DEFAULT_TEMPERATURE = parseFloat(process.env.LLM_TEMPERATURE ?? "0.1");
const CHAT_REQUEST_DEADLINE_MS = parseInt(process.env.CHAT_REQUEST_DEADLINE_MS ?? "60000", 10);

export class HttpQwenClient implements QwenClient {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly apiKey?: string;
  private readonly defaultTimeoutMs: number;
  private readonly maxRetries: number;
  private readonly temperature: number;

  constructor(options: {
    baseUrl: string;
    model: string;
    apiKey?: string;
    timeoutMs?: number;
    maxRetries?: number;
    temperature?: number;
  }) {
    this.baseUrl = options.baseUrl.replace(/\/+$/, "");
    this.model = options.model;
    this.apiKey = options.apiKey;
    this.defaultTimeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.maxRetries = options.maxRetries ?? DEFAULT_MAX_RETRIES;
    this.temperature = options.temperature ?? DEFAULT_TEMPERATURE;
  }

  async chat(messages: QwenMessage[]): Promise<string> {
    const deadline = Date.now() + CHAT_REQUEST_DEADLINE_MS;

    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const abortController = new AbortController();
        const timeoutId = setTimeout(() => abortController.abort(), this.defaultTimeoutMs);

        try {
          const response = await fetch(`${this.baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(this.apiKey ? { Authorization: `Bearer ${this.apiKey}` } : {}),
            },
            body: JSON.stringify({
              model: this.model,
              messages: messages,
              temperature: this.temperature,
              top_p: 0.9,
            }),
            signal: abortController.signal,
          });

          clearTimeout(timeoutId);

          if (response.status === 429 || (response.status >= 500 && response.status < 600)) {
            if (attempt === this.maxRetries) {
              throw new LlmUnavailableError(`LLM unavailable after ${attempt + 1} attempts: HTTP ${response.status}`);
            }
            const delay = this.exponentialBackoffWithJitter(attempt + 1);
            await new Promise((resolve) => setTimeout(resolve, delay));
            continue;
          }

          if (!response.ok) {
            const errorBody = await response.text().catch(() => "");
            throw new LlmBadResponseError(`LLM request failed: HTTP ${response.status}${errorBody ? `: ${errorBody}` : ""}`);
          }

          const data = await response.json();
          const content = data?.choices?.[0]?.message?.content;

          if (!content) {
            throw new LlmBadResponseError("LLM response missing 'choices[0].message.content'");
          }

          return content;
        } finally {
          clearTimeout(timeoutId);
        }
      } catch (error) {
        if (error instanceof LlmBadResponseError) {
          throw error;
        }
        if (error instanceof LlmUnavailableError) {
          throw error;
        }
        if (error instanceof LlmTimeoutError || error instanceof Error && error.name === 'AbortError') {
          if (attempt === this.maxRetries) {
            throw new LlmTimeoutError(`LLM request timed out after ${attempt + 1} attempts`);
          }
          const delay = this.exponentialBackoffWithJitter(attempt + 1);
          await new Promise((resolve) => setTimeout(resolve, delay));
          continue;
        }
        if (attempt === this.maxRetries) {
          throw new LlmUnavailableError(`LLM service unavailable: ${error instanceof Error ? error.message : String(error)}`);
        }
        const delay = this.exponentialBackoffWithJitter(attempt + 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      if (Date.now() > deadline) {
        throw new LlmTimeoutError(`Total request deadline exceeded (${CHAT_REQUEST_DEADLINE_MS}ms)`);
      }
    }

    throw new LlmUnavailableError("LLM unavailable after all retry attempts");
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.chat([{ role: "system", content: "Test" }]);
      return true;
    } catch {
      return false;
    }
  }

  private exponentialBackoffWithJitter(attempt: number): number {
    const baseDelay = 1000;
    const maxDelay = 10000;
    const jitter = Math.random() * 1000;
    const delay = Math.min(baseDelay * Math.pow(2, attempt) + jitter, maxDelay);
    return delay;
  }
}

// Singleton dengan lazy initialization
let clientInstance: QwenClient | null = null;

export function getQwenClient(): QwenClient {
  if (!clientInstance) {
    const baseUrl = getEnvOrThrow("LLM_BASE_URL");
    const model = getEnvOrThrow("LLM_MODEL");
    const apiKey = getEnvOrUndefined("LLM_API_KEY");

    clientInstance = new HttpQwenClient({
      baseUrl,
      model,
      apiKey,
      timeoutMs: DEFAULT_TIMEOUT_MS,
      maxRetries: DEFAULT_MAX_RETRIES,
      temperature: DEFAULT_TEMPERATURE,
    });
  }
  return clientInstance;
}

// Export untuk compatibility
export const qwenClient = getQwenClient();

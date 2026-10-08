import type { IndicatorCode } from "@/lib/chat/types";

/**
 * Interface untuk Knowledge Retriever (RAG).
 * Ini antarmuka yang akan diimplementasi oleh AI engineer lain.
 */
export interface KnowledgeRetriever {
  /**
   * Cari informasi tentang IKU dari knowledge base.
   * @param query Query pencarian (misal: "definisi IKU 003", "aturan IKU 005")
   * @returns List of chunks with text dan source
   */
  search(query: string): Promise<{ chunks: { text: string; source: string }[] }>;
}

/**
 * Stub implementation untuk RAG knowledge retriever.
 * Ini antarmuka saja, implementasi asli dikerjakan oleh AI engineer lain.
 */
export class StubKnowledgeRetriever implements KnowledgeRetriever {
  async search(_query: string): Promise<{ chunks: { text: string; source: string }[] }> {
    // Return empty results - implementasi asli akan diganti oleh AI engineer
    return { chunks: [] };
  }
}

// Export singleton
export const knowledgeRetriever = new StubKnowledgeRetriever();

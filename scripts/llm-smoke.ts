#!/usr/bin/env ts-node
/**
 * LLM Smoke Test Script
 * Jalankan manual untuk verifikasi Qwen client sebelum production.
 * 
 * Cara pakai: npx ts-node scripts/llm-smoke.ts
 */

import { loadEnvConfig } from "@next/env";
import { HttpQwenClient } from "@/lib/chat/qwen-client";
import { LlmTimeoutError, LlmUnavailableError, LlmBadResponseError } from "@/lib/chat/types";

loadEnvConfig(process.cwd());

const getClient = () => {
  const baseUrl = process.env.LLM_BASE_URL;
  const model = process.env.LLM_MODEL;
  const apiKey = process.env.LLM_API_KEY;

  if (!baseUrl || !model) {
    console.error("ERROR: LLM_BASE_URL dan LLM_MODEL wajib di-set di .env");
    process.exit(1);
  }

  return new HttpQwenClient({
    baseUrl,
    model,
    apiKey: apiKey ?? undefined,
    timeoutMs: 30000,
    maxRetries: 2,
    temperature: 0.1,
  });
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const logSection = (title: string) => {
  console.log("\n" + "=".repeat(60));
  console.log(` ${title}`);
  console.log("=".repeat(60));
};

// Test 1: Identity check
async function test1_IdentityCheck() {
  logSection("TEST 1: Identity Check");
  const client = getClient();
  const messages = [
    { role: "system" as const, content: "Kamu asisten Dikti Indicator" },
    { role: "user" as const, content: "Kamu siapa?" },
  ];

  console.log("Sending: 'Kamu siapa?' with system prompt 'Kamu asisten Dikti Indicator'");
  
  try {
    const response = await client.chat(messages);
    console.log(`RESPONSE: ${response}`);
    const isCorrect = response.includes("Dikti") || response.includes("dikti");
    console.log(`PASS: ${isCorrect} (jawaban harus menyebut Dikti Indicator)`);
    return isCorrect;
  } catch (error) {
    console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// Test 2: JSON format compliance
async function test2_JsonFormat() {
  logSection("TEST 2: JSON Format Compliance");
  const client = getClient();
  const messages = [
    { role: "system" as const, content: "Kamu harus balas HANYA JSON tanpa teks lain" },
    { role: "user" as const, content: "balas HANYA JSON {\"test\": \"value\"}" },
  ];

  console.log("Sending: 'balas HANYA JSON {...}'");
  
  try {
    const response = await client.chat(messages);
    console.log(`RESPONSE: ${response}`);
    
    // Check if response is pure JSON or wrapped
    const trimmed = response.trim();
    const isPureJson = trimmed.startsWith("{") && trimmed.endsWith("}");
    const hasCodeFence = trimmed.startsWith("```json") || trimmed.startsWith("```");
    const hasExtraText = !isPureJson && !hasCodeFence;
    
    console.log(`Pure JSON: ${isPureJson}`);
    console.log(`Has code fence: ${hasCodeFence}`);
    console.log(`Has extra text: ${hasExtraText}`);
    
    return isPureJson || hasCodeFence; // Either is acceptable, but pure JSON is better
  } catch (error) {
    console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// Test 3: Optional - tool calling support
async function test3_ToolCalling() {
  logSection("TEST 3: Tool Calling Support (Optional)");
  const client = getClient();
  const messages = [
    { role: "system" as const, content: "Kamu memiliki akses ke tool 'get_data' untuk mengambil data IKU" },
    { role: "user" as const, content: "Berapa total mahasiswa di IKU-003 tahun 2024?" },
  ];

  console.log("Sending: pertanyaan yang meminta data IKU");
  console.log("Note: LLM harus memanggil tool 'get_data', bukan langsung jawab");
  
  try {
    const response = await client.chat(messages);
    console.log(`RESPONSE: ${response}`);
    
    // Check if LLM called tool (depends on model support)
    const hasToolCall = response.includes("tool") || response.includes("get_data");
    const isDirectAnswer = response.includes("total") || response.includes("mahasiswa");
    
    console.log(`Contains tool reference: ${hasToolCall}`);
    console.log(`Direct answer: ${isDirectAnswer}`);
    
    if (hasToolCall) {
      console.log("LLM mendukung tool calling - PASS");
    } else if (isDirectAnswer) {
      console.log("LLM tidak memanggil tool (mungkin native tool calling tidak didukung)");
    }
    
    return true; // Not critical
  } catch (error) {
    console.error(`SKIP/ERROR: ${error instanceof Error ? error.message : String(error)}`);
    return true; // Not critical
  }
}

// Test 4: Health check
async function test4_HealthCheck() {
  logSection("TEST 4: Health Check");
  const client = getClient();
  
  try {
    if (!client.healthCheck) {
      console.log("healthCheck() not implemented - SKIPPED");
      return true;
    }
    
    const healthy = await client.healthCheck();
    console.log(`Health check result: ${healthy}`);
    console.log(`PASS: ${healthy}`);
    return healthy;
  } catch (error) {
    console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`);
    return false;
  }
}

// Main
async function main() {
  console.log("=".repeat(60));
  console.log(" LLM SMOKE TEST");
  console.log("=".repeat(60));
  console.log(`Base URL: ${process.env.LLM_BASE_URL}`);
  console.log(`Model: ${process.env.LLM_MODEL}`);
  console.log(`Timeout: ${process.env.LLM_TIMEOUT_MS ?? 30000}ms`);

  const results = {
    test1: false,
    test2: false,
    test3: false,
    test4: false,
  };

  try {
    results.test1 = await test1_IdentityCheck();
    await sleep(1000);
    
    results.test2 = await test2_JsonFormat();
    await sleep(1000);
    
    results.test3 = await test3_ToolCalling();
    await sleep(1000);
    
    results.test4 = await test4_HealthCheck();
  } catch (error) {
    console.error("\nCRITICAL ERROR:", error);
    process.exit(1);
  }

  logSection("SUMMARY");
  console.log(`Test 1 (Identity): ${results.test1 ? "PASS" : "FAIL"}`);
  console.log(`Test 2 (JSON): ${results.test2 ? "PASS" : "FAIL"}`);
  console.log(`Test 3 (Tool): ${results.test3 ? "PASS" : "FAIL"}`);
  console.log(`Test 4 (Health): ${results.test4 ? "PASS" : "FAIL"}`);

  const passed = Object.values(results).filter(Boolean).length;
  console.log(`\nTotal: ${passed}/4 tests passed`);
}

main();

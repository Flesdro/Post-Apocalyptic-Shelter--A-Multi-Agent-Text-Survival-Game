import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

class ApiError extends Error {
  constructor(status, body) {
    super(`API request failed with status ${status}`);
    this.status = status;
    this.body = body;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const provider = process.env.LLM_PROVIDER ?? "gemini";
const apiKey = getApiKey(provider);
const baseUrl = getBaseUrl(provider);
const model = getModel(provider);
const apiType = process.env.LLM_API_TYPE ?? "responses";

if (!["gemini", "openai", "openai-compatible"].includes(provider)) {
  fail('LLM_PROVIDER must be "gemini", "openai", or "openai-compatible".');
}

if (!apiKey || apiKey.includes("your_")) {
  fail(`Missing API key for ${provider}. Put it in .env.local or export it in your shell.`);
}

if (provider !== "gemini" && !["responses", "chat"].includes(apiType)) {
  fail('LLM_API_TYPE must be either "responses" or "chat".');
}

console.log(`Testing LLM API`);
console.log(`Provider: ${provider}`);
console.log(`Base URL: ${baseUrl}`);
console.log(`Model: ${model}`);
console.log(`API type: ${provider === "gemini" ? "generateContent" : apiType}`);

try {
  const startedAt = Date.now();
  const text = await testProvider();
  const elapsed = Date.now() - startedAt;

  console.log("\nAPI test passed.");
  console.log(`Latency: ${elapsed}ms`);
  console.log(`Model reply: ${text}`);
} catch (error) {
  console.error("\nAPI test failed.");

  if (error instanceof ApiError) {
    console.error(`Status: ${error.status}`);
    console.error(`Response: ${error.body}`);
  } else {
    console.error(error);
  }

  process.exit(1);
}

async function testProvider() {
  if (provider === "gemini") {
    return testGemini();
  }

  return apiType === "chat" ? testChatCompletions() : testResponses();
}

async function testGemini() {
  const response = await fetch(`${baseUrl}/models/${model}:generateContent`, {
    method: "POST",
    headers: {
      "x-goog-api-key": apiKey,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Reply with exactly one short sentence: shelter online."
            }
          ]
        }
      ]
    })
  });

  const data = await readJsonResponse(response);
  return extractGeminiText(data) ?? JSON.stringify(data).slice(0, 300);
}

async function testResponses() {
  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: "Reply with exactly one short sentence: shelter online."
    })
  });

  const data = await readJsonResponse(response);
  return data.output_text ?? extractResponsesText(data) ?? JSON.stringify(data).slice(0, 300);
}

async function testChatCompletions() {
  const response = await fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      messages: [
        {
          role: "user",
          content: "Reply with exactly one short sentence: shelter online."
        }
      ]
    })
  });

  const data = await readJsonResponse(response);
  return data.choices?.[0]?.message?.content ?? JSON.stringify(data).slice(0, 300);
}

async function readJsonResponse(response) {
  const body = await response.text();

  if (!response.ok) {
    throw new ApiError(response.status, body);
  }

  try {
    return JSON.parse(body);
  } catch {
    throw new Error(`Response is not valid JSON: ${body}`);
  }
}

function extractResponsesText(data) {
  const parts = [];

  for (const item of data.output ?? []) {
    for (const content of item.content ?? []) {
      if (content.type === "output_text" && content.text) {
        parts.push(content.text);
      }
    }
  }

  return parts.length > 0 ? parts.join("\n") : undefined;
}

function extractGeminiText(data) {
  const parts = data.candidates?.[0]?.content?.parts ?? [];
  const textParts = parts.map((part) => part.text).filter(Boolean);

  return textParts.length > 0 ? textParts.join("\n") : undefined;
}

function loadEnvFile(filename) {
  const path = resolve(process.cwd(), filename);

  if (!existsSync(path)) {
    return;
  }

  const content = readFileSync(path, "utf8");

  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separator = trimmed.indexOf("=");

    if (separator === -1) {
      continue;
    }

    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }
}

function trimTrailingSlash(value) {
  return value.replace(/\/$/, "");
}

function getApiKey(currentProvider) {
  if (currentProvider === "gemini") {
    return process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY ?? process.env.LLM_API_KEY;
  }

  return process.env.OPENAI_API_KEY ?? process.env.LLM_API_KEY;
}

function getBaseUrl(currentProvider) {
  if (currentProvider === "gemini") {
    return trimTrailingSlash(process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta");
  }

  return trimTrailingSlash(process.env.OPENAI_BASE_URL ?? process.env.LLM_BASE_URL ?? "https://api.openai.com/v1");
}

function getModel(currentProvider) {
  if (currentProvider === "gemini") {
    return process.env.GEMINI_MODEL ?? process.env.LLM_MODEL ?? "gemini-2.5-flash";
  }

  return process.env.OPENAI_MODEL ?? process.env.LLM_MODEL ?? "gpt-5.2";
}

function fail(message) {
  console.error(message);
  process.exit(1);
}

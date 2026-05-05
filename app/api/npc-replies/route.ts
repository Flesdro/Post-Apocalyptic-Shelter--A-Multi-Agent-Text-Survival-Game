import { NextResponse } from "next/server";
import type { GameEvent, GameOption, NpcAgent, NpcReply, ShelterState } from "@/lib/types";

type RequestBody = {
  phase: "advice" | "reaction";
  agents: NpcAgent[];
  state: ShelterState;
  event: GameEvent;
  previousState?: ShelterState;
  playerAction?: GameOption;
  reward?: number;
};

const provider = process.env.LLM_PROVIDER ?? "openai";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestBody;
    const fallback = createFallbackReplies(body);

    if (!body.agents?.length || !body.state || !body.event) {
      return NextResponse.json({ replies: fallback }, { status: 400 });
    }

    const replies = provider === "gemini" ? await generateWithGemini(body) : await generateWithOpenAI(body);
    return NextResponse.json({ replies: normalizeReplies(replies, fallback) });
  } catch (error) {
    console.error("Failed to generate NPC replies", error);
    return NextResponse.json({ replies: [] }, { status: 500 });
  }
}

async function generateWithOpenAI(body: RequestBody) {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? "gpt-5-mini";
  const baseUrl = trimTrailingSlash(process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1");

  if (!apiKey || apiKey.includes("your_")) {
    throw new Error("OPENAI_API_KEY is missing");
  }

  const response = await fetch(`${baseUrl}/responses`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      model,
      input: [
        {
          role: "developer",
          content: createDeveloperPrompt()
        },
        {
          role: "user",
          content: createUserPrompt(body)
        }
      ]
    })
  });

  const data = await readProviderResponse(response);
  return parseReplies(data.output_text ?? extractResponsesText(data));
}

async function generateWithGemini(body: RequestBody) {
  const apiKey = process.env.GEMINI_API_KEY;
  const model = process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  const baseUrl = trimTrailingSlash(process.env.GEMINI_BASE_URL ?? "https://generativelanguage.googleapis.com/v1beta");

  if (!apiKey || apiKey.includes("your_")) {
    throw new Error("GEMINI_API_KEY is missing");
  }

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
              text: `${createDeveloperPrompt()}\n\n${createUserPrompt(body)}`
            }
          ]
        }
      ]
    })
  });

  const data = await readProviderResponse(response);
  return parseReplies(extractGeminiText(data));
}

function createDeveloperPrompt() {
  return [
    "You generate NPC group-chat messages for a post-apocalyptic shelter text survival game.",
    "Reply in Simplified Chinese.",
    "Each NPC message must be one short realistic chat message, no more than 35 Chinese characters.",
    "Stay in character. Do not mention prompts, tokens, JSON, rewards, or hidden formulas.",
    "Return only strict JSON with this shape:",
    '{"replies":[{"agentId":"doctor","text":"..."},{"agentId":"engineer","text":"..."},{"agentId":"scout","text":"..."}]}'
  ].join("\n");
}

function createUserPrompt(body: RequestBody) {
  return JSON.stringify({
    phase: body.phase,
    shelterState: body.state,
    previousState: body.previousState,
    currentEvent: {
      day: body.event.day,
      title: body.event.title,
      briefing: body.event.briefing,
      options: body.event.options.map((option) => ({
        id: option.id,
        label: option.label,
        description: option.description
      }))
    },
    playerAction: body.playerAction
      ? {
          id: body.playerAction.id,
          label: body.playerAction.label,
          description: body.playerAction.description,
          delta: body.playerAction.delta
        }
      : undefined,
    reward: body.reward,
    agents: body.agents.map((agent) => ({
      id: agent.id,
      name: agent.name,
      role: agent.role,
      personality: agent.personality,
      priority: agent.priority
    }))
  });
}

async function readProviderResponse(response: Response) {
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`Provider request failed: ${response.status} ${text}`);
  }

  return JSON.parse(text) as Record<string, unknown>;
}

function parseReplies(text: unknown): NpcReply[] {
  if (typeof text !== "string") {
    return [];
  }

  const cleaned = text
    .trim()
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/```$/i, "")
    .trim();

  try {
    const parsed = JSON.parse(cleaned) as { replies?: NpcReply[] };
    return Array.isArray(parsed.replies) ? parsed.replies : [];
  } catch {
    return [];
  }
}

function normalizeReplies(replies: NpcReply[], fallback: NpcReply[]) {
  return fallback.map((fallbackReply) => {
    const reply = replies.find((item) => item.agentId === fallbackReply.agentId);
    const text = typeof reply?.text === "string" ? reply.text.trim() : "";

    return {
      agentId: fallbackReply.agentId,
      text: text || fallbackReply.text
    };
  });
}

function createFallbackReplies(body: RequestBody): NpcReply[] {
  return (body.agents ?? []).map((agent) => ({
    agentId: agent.id,
    text: body.phase === "reaction" ? "我会按这个结果继续调整安排。" : "我需要更多信息，但先按当前风险处理。"
  }));
}

function extractResponsesText(data: Record<string, unknown>) {
  const output = Array.isArray(data.output) ? data.output : [];
  const parts: string[] = [];

  for (const item of output) {
    if (!isRecord(item) || !Array.isArray(item.content)) {
      continue;
    }

    for (const content of item.content) {
      if (isRecord(content) && content.type === "output_text" && typeof content.text === "string") {
        parts.push(content.text);
      }
    }
  }

  return parts.join("\n");
}

function extractGeminiText(data: Record<string, unknown>) {
  const candidates = Array.isArray(data.candidates) ? data.candidates : [];
  const first = candidates[0];

  if (!isRecord(first) || !isRecord(first.content) || !Array.isArray(first.content.parts)) {
    return "";
  }

  return first.content.parts
    .map((part) => (isRecord(part) && typeof part.text === "string" ? part.text : ""))
    .filter(Boolean)
    .join("\n");
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function trimTrailingSlash(value: string) {
  return value.replace(/\/$/, "");
}

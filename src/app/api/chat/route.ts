import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { GoogleGenAI } from "@google/genai";
import { CHAT_SYSTEM_PROMPT } from "@/lib/gemini";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Models in priority order - falls back if primary is unavailable
const MODELS = ["gemini-3.5-flash", "gemini-2.5-flash"];

interface ChatMessage {
  role: "user" | "model";
  text: string;
}

async function callGeminiWithFallback(
  contents: { role: string; parts: { text: string }[] }[]
) {
  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: contents as any,
      });
      return response;
    } catch (err: any) {
      const status = err?.status || err?.code;
      if (status === 503 || status === "UNAVAILABLE") {
        console.warn(`Model ${model} unavailable (503), trying fallback...`);
        continue;
      }
      throw err;
    }
  }
  throw new Error(
    "All Gemini models are currently unavailable. Please try again later."
  );
}

/** Parse <options>["A","B"]</options> from text */
function parseOptions(text: string): { cleanText: string; options: string[] } {
  const optionsMatch = text.match(/<options>(\[.*?\])<\/options>/);
  if (optionsMatch) {
    try {
      const options = JSON.parse(optionsMatch[1]);
      if (Array.isArray(options) && options.every((o) => typeof o === "string")) {
        const cleanText = text.replace(optionsMatch[0], "").trim();
        return { cleanText, options };
      }
    } catch {
      // Invalid JSON, ignore options
    }
  }
  return { cleanText: text.trim(), options: [] };
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    let body: { message: string; history: ChatMessage[] };
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 }
      );
    }

    const { message, history } = body;

    if (!message) {
      return NextResponse.json(
        { error: "Message is required" },
        { status: 400 }
      );
    }

    // Build conversation contents for the Gemini chat
    const contents: { role: string; parts: { text: string }[] }[] = [];

    // Add system instruction as the first user message context
    if (history.length === 0) {
      contents.push({
        role: "user",
        parts: [
          {
            text: `[System Instructions: ${CHAT_SYSTEM_PROMPT}]\n\nHi! I'd like to create a PRD for my product.`,
          },
        ],
      });
      contents.push({
        role: "model",
        parts: [
          {
            text: "Great! I'd love to help you create a comprehensive PRD. Tell me about your product idea - what are you building and what problem does it solve?\n\n<options>[\"E-commerce\", \"SaaS Tool\", \"Mobile App\", \"Social Platform\"]</options>",
          },
        ],
      });
    }

    // Replay conversation history
    for (const msg of history) {
      contents.push({
        role: msg.role,
        parts: [{ text: msg.text }],
      });
    }

    // Add new user message
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

    const response = await callGeminiWithFallback(contents);
    const rawReply = response.text ?? "";

    // Parse options from the reply
    const { cleanText, options } = parseOptions(rawReply);

    // Clean the JSON signal block from the display text
    const displayReply = cleanText
      .replace(/```json\s*\{[\s\S]*?\}\s*```/, "")
      .trim();

    // Check if the AI signaled readiness with the JSON block
    let ready = false;
    let summary = null;

    const jsonMatch = rawReply.match(/```json\s*(\{[\s\S]*?\})\s*```/);
    if (jsonMatch) {
      try {
        const parsed = JSON.parse(jsonMatch[1]);
        if (parsed.ready && parsed.summary) {
          ready = true;
          summary = parsed.summary;
        }
      } catch {
        // Not valid JSON, continue normally
      }
    }

    return NextResponse.json({
      reply: displayReply,
      options: ready ? [] : options,
      ready,
      summary,
    });
  } catch (error) {
    console.error("Chat error:", error);
    const message =
      error instanceof Error && error.message.includes("unavailable")
        ? error.message
        : "Failed to process chat message. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { generatePRD, type PRDFormInput } from "@/lib/gemini";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
const MODELS = ["gemini-3.5-flash", "gemini-2.5-flash"];

async function extractSummaryFromChat(
  chatHistory: string
): Promise<PRDFormInput> {
  const extractPrompt = `Extract structured product information from this conversation and return ONLY a JSON object with this exact shape:

{"productName": "", "description": "", "problemStatement": "", "targetUsers": "", "features": ["", ""], "goals": "", "constraints": "", "techStack": ""}

Conversation:
${chatHistory}

Return ONLY the JSON object, no other text.`;

  for (const model of MODELS) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents: extractPrompt,
      });

      const text = response.text ?? "";
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]) as PRDFormInput;
      }
      throw new Error("Could not parse summary from chat");
    } catch (err: any) {
      const status = err?.status || err?.code;
      if (status === 503 || status === "UNAVAILABLE") continue;
      if (err?.message?.includes("Could not parse")) continue;
      throw err;
    }
  }
  throw new Error("Could not extract summary from conversation");
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
    const body = await request.json();

    let summary: PRDFormInput;

    if (body.summary && body.summary.productName) {
      summary = body.summary;
    } else if (body.chatHistory) {
      summary = await extractSummaryFromChat(body.chatHistory);
    } else {
      return NextResponse.json(
        { error: "Either summary or chatHistory is required" },
        { status: 400 }
      );
    }

    // Ensure features is an array
    if (!Array.isArray(summary.features)) {
      summary.features = [String(summary.features || "Core features")];
    }
    if (summary.features.length === 0) {
      summary.features = ["Core features"];
    }

    // Fill in missing optional fields with defaults
    summary.productName = summary.productName || "Untitled Project";
    summary.description = summary.description || "";
    summary.problemStatement =
      summary.problemStatement || summary.description || "Solving a key problem";
    summary.targetUsers = summary.targetUsers || "General users";
    summary.goals = summary.goals || "Deliver a functional MVP";
    summary.constraints = summary.constraints || "";
    summary.techStack = summary.techStack || "";

    // Generate PRD with Gemini
    const content = await generatePRD(summary);

    // Save to database
    const { data: prd, error } = await supabase
      .from("prds")
      .insert({
        user_id: user.id,
        title: summary.productName,
        form_input: summary as unknown as Record<string, unknown>,
        content,
      })
      .select()
      .single();

    if (error) {
      console.error("DB save error:", JSON.stringify(error, null, 2));
      // Still return the content even if DB save fails
      return NextResponse.json({
        id: null,
        content,
        title: summary.productName,
        saveError: true,
      });
    }

    return NextResponse.json({
      id: prd.id,
      content,
      title: summary.productName,
    });
  } catch (error) {
    console.error(
      "Chat PRD generation error:",
      error instanceof Error ? error.message : error
    );
    return NextResponse.json(
      { error: "Failed to generate PRD. Please try again." },
      { status: 500 }
    );
  }
}

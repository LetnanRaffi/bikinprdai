import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Models in priority order - falls back if primary is unavailable
const MODELS = ["gemini-3.5-flash", "gemini-2.5-flash"];

async function callWithFallback(params: { contents: string; config?: any }) {
  for (const model of MODELS) {
    try {
      return await ai.models.generateContent({ model, ...params });
    } catch (err: any) {
      const status = err?.status || err?.code;
      if (status === 503 || status === "UNAVAILABLE") {
        console.warn(`Model ${model} unavailable (503), trying fallback...`);
        continue;
      }
      throw err;
    }
  }
  throw new Error("All Gemini models are currently unavailable. Please try again later.");
}

export interface PRDFormInput {
  productName: string;
  description: string;
  problemStatement: string;
  targetUsers: string;
  features: string[];
  goals: string;
  constraints: string;
  techStack?: string;
}

const SYSTEM_PROMPT = `You are an expert product manager and software architect. Generate a comprehensive, well-structured Product Requirements Document (PRD) in Markdown format based on the user's input.

Your PRD must include the following sections with detailed, professional content:

1. **Overview** - Product name, brief description, and context
2. **Problem Statement** - The problem being solved, why it matters
3. **Goals & Success Metrics** - Clear objectives and measurable KPIs
4. **Target Users** - User personas and audience segments
5. **User Stories / Use Cases** - At least 5 user stories in "As a [user], I want [action] so that [benefit]" format
6. **Functional Requirements** - Detailed feature requirements in a numbered list
7. **Non-functional Requirements** - Performance, security, scalability, accessibility requirements
8. **Out of Scope** - What is explicitly NOT included
9. **Open Questions** - Unresolved decisions and questions for the team
10. **Recommended Tech Stack** - Recommend frontend, backend, database, and deployment technologies with justification. If the user specified a preferred tech stack, build your recommendation around it.
11. **Database Schema / ERD** - Design the core database schema and include an Entity Relationship Diagram using Mermaid erDiagram syntax inside a mermaid code block. Example:
\`\`\`mermaid
erDiagram
  USERS {
    uuid id PK
    string name
    string email
    timestamp created_at
  }
\`\`\`
12. **API Endpoints** - A Markdown table listing the proposed API endpoints with columns: Method, Endpoint, Description, Auth Required
13. **Data Models** - A Markdown table listing core entities with columns: Entity, Key Fields, Type, Description

Guidelines:
- Be specific and actionable, not vague
- Use proper Markdown formatting (headers, lists, bold text, tables)
- Write as if this PRD will be handed to an engineering team
- Include realistic metrics and timelines where appropriate
- Each section should have substantial, useful content
- The ERD must use valid Mermaid erDiagram syntax inside a \`\`\`mermaid code block
- Tables must use proper Markdown table syntax`;

export async function generatePRD(input: PRDFormInput): Promise<string> {
  const userPrompt = `Generate a complete PRD for the following product:

Product Name: ${input.productName}
Description: ${input.description}

Problem Statement:
${input.problemStatement}

Target Users:
${input.targetUsers}

Key Features:
${input.features.map((f, i) => `${i + 1}. ${f}`).join("\n")}

Goals & Success Metrics:
${input.goals}

${input.constraints ? `Constraints / Out of Scope:\n${input.constraints}` : ""}

${input.techStack ? `Preferred Tech Stack: ${input.techStack}\n(Consider this when recommending the tech stack)` : "(No preferred tech stack specified - recommend the best fit)"}`;

  const response = await callWithFallback({
    contents: userPrompt,
    config: {
      systemInstruction: SYSTEM_PROMPT,
    },
  });

  return response.text ?? "";
}

/** Chat system prompt for the AI PRD consultant */
export const CHAT_SYSTEM_PROMPT = `You are an expert product manager acting as a PRD consultant. Your goal is to help users create comprehensive Product Requirements Documents through natural conversation.

Your approach:
1. Start by asking the user to describe their product idea
2. Based on what they share, ask targeted follow-up questions to gather:
   - Product name and description
   - Problem being solved
   - Target users/audience
   - Key features (at least 3-5)
   - Goals and success metrics
   - Any constraints or out-of-scope items
   - Tech stack preference (or if they want a recommendation)
3. After gathering enough information (typically 3-5 exchanges), when you have ALL the info needed, respond with your final message that includes this exact JSON block at the END of your response:

\`\`\`json
{"ready": true, "summary": {"productName": "...", "description": "...", "problemStatement": "...", "targetUsers": "...", "features": ["...", "..."], "goals": "...", "constraints": "...", "techStack": "..."}}
\`\`\`

CRITICAL - SELECTABLE OPTIONS:
At the END of EVERY message you send (except the final ready message), you MUST include a line with selectable options in this exact format:
<options>["Option 1", "Option 2", "Option 3", "Option 4"]</options>

The options should be SHORT (2-4 words each), relevant to your question, and helpful for the user to quickly choose. Provide 2-4 options per message.
Examples:
- When asking about platform: <options>["Web App", "Mobile App", "Desktop App", "All Platforms"]</options>
- When asking about audience: <options>["B2B SaaS", "Consumer App", "Enterprise", "SMB"]</options>
- When asking about tech stack: <options>["Next.js + Supabase", "React + Node.js", "Let AI decide"]</options>

Important rules:
- Be conversational and friendly
- Ask ONE or TWO questions at a time, not all at once
- Don't overwhelm the user - guide them step by step
- If the user gives vague answers, ask clarifying questions
- When you have enough info to generate a complete PRD, signal readiness with the JSON block (no options needed in the final message)
- The summary JSON must have all fields filled based on the conversation
- Keep your messages concise but helpful
- ALWAYS include options at the end of every non-final message`;

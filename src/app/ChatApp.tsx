"use client";

import { useState, useRef, useEffect } from "react";
import { toast } from "sonner";
import { copyToClipboard, downloadAsMarkdown } from "@/lib/export";
import dynamic from "next/dynamic";
import ChatMessage from "@/components/ChatMessage";
import type { User } from "@supabase/supabase-js";

const PRDPreview = dynamic(() => import("@/components/PRDPreview"), {
  ssr: false,
});

interface SavedPRD {
  id: string;
  title: string;
  content: string;
  created_at: string;
}

interface Message {
  role: "user" | "model";
  text: string;
  options?: string[];
}

interface ChatAppProps {
  prds: SavedPRD[];
  user: User;
}

export default function ChatApp({ prds: initialPrds, user }: ChatAppProps) {
  const [prds, setPrds] = useState<SavedPRD[]>(initialPrds);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      text: "Hi! I'm your AI PRD consultant. Tell me about your product idea — what are you building and what problem does it solve?",
      options: ["E-commerce App", "SaaS Tool", "Mobile App", "Social Platform"],
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [prdContent, setPrdContent] = useState("");
  const [prdTitle, setPrdTitle] = useState("");
  const [generating, setGenerating] = useState(false);
  const [chatCount, setChatCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [rightPanelOpen, setRightPanelOpen] = useState(false);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  // Auto-open right panel when PRD is generated
  useEffect(() => {
    if (prdContent) {
      setRightPanelOpen(true);
    }
  }, [prdContent]);

  const sendMessage = async (text?: string) => {
    const trimmed = (text || input).trim();
    if (!trimmed || loading) return;

    const userMsg: Message = { role: "user", text: trimmed };
    const history = messages.map((m) => ({ role: m.role, text: m.text }));

    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, history }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Chat failed");

      const aiMsg: Message = {
        role: "model",
        text: data.reply,
        options: data.options || [],
      };
      setMessages((prev) => [...prev, aiMsg]);
      setChatCount((prev) => prev + 1);

      // If AI provided a summary, auto-generate the PRD
      if (data.ready && data.summary && !prdContent) {
        autoGeneratePRD(data.summary);
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Chat error");
      setMessages((prev) => [
        ...prev,
        { role: "model", text: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const refreshPrds = async () => {
    try {
      const res = await fetch("/api/prds");
      if (res.ok) {
        const data = await res.json();
        setPrds(data.prds);
      }
    } catch {
      // Silently fail on sidebar refresh
    }
  };

  const autoGeneratePRD = async (summary: any) => {
    setGenerating(true);
    try {
      const res = await fetch("/api/chat/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ summary }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate PRD");

      setPrdContent(data.content);
      setPrdTitle(summary.productName || "PRD");
      toast.success("PRD generated and saved!");
      await refreshPrds();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const generateFromChat = async () => {
    setGenerating(true);
    try {
      const chatHistory = messages
        .filter((m) => m.text)
        .map((m) => `${m.role === "user" ? "User" : "AI"}: ${m.text}`)
        .join("\n\n");

      const res = await fetch("/api/chat/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chatHistory }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate PRD");

      setPrdContent(data.content);
      setPrdTitle(data.title || "PRD");
      toast.success("PRD generated and saved!");
      await refreshPrds();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleCopy = async () => {
    try {
      await copyToClipboard(prdContent);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = () => {
    downloadAsMarkdown(prdTitle, prdContent);
    toast.success("Downloaded as .md");
  };

  const resetChat = () => {
    setMessages([
      {
        role: "model",
        text: "Hi! I'm your AI PRD consultant. Tell me about your product idea — what are you building and what problem does it solve?",
        options: ["E-commerce App", "SaaS Tool", "Mobile App", "Social Platform"],
      },
    ]);
    setInput("");
    setPrdContent("");
    setPrdTitle("");
    setChatCount(0);
    setRightPanelOpen(false);
  };

  const showGenerateButton = chatCount >= 2 && !prdContent && !generating;

  const userName =
    user.user_metadata?.full_name || user.email?.split("@")[0] || "User";
  const userAvatar = user.user_metadata?.avatar_url;

  return (
    <div className="h-screen flex overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`${
          sidebarOpen ? "w-72" : "w-0"
        } shrink-0 transition-all duration-300 overflow-hidden flex flex-col border-r border-[#c8ccd0]`}
        style={{ background: "var(--neu-bg)" }}
      >
        {/* Sidebar Header */}
        <div className="p-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
            >
              <svg
                className="w-4 h-4 text-white"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <span className="font-bold text-slate-700">BikinPRD</span>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="p-1.5 rounded-lg hover:bg-[#dfe6ee] transition-colors cursor-pointer"
          >
            <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* New Chat Button */}
        <div className="px-4 pb-3">
          <button
            onClick={resetChat}
            className="w-full flex items-center gap-2 px-4 py-2.5 neu-btn-primary text-sm font-medium cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            New PRD
          </button>
        </div>

        {/* PRD History */}
        <div className="flex-1 overflow-y-auto px-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider px-2 py-2">
            History
          </p>
          {prds.length === 0 ? (
            <p className="text-xs text-slate-400 px-2 py-4">No PRDs yet. Start chatting!</p>
          ) : (
            <div className="space-y-1">
              {prds.map((prd) => (
                <a
                  key={prd.id}
                  href={`/prd/${prd.id}`}
                  className="block px-3 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-[#dfe6ee] transition-colors truncate"
                >
                  <div className="font-medium truncate">{prd.title}</div>
                  <div className="text-xs text-slate-400 mt-0.5">
                    {new Date(prd.created_at).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    })}
                  </div>
                </a>
              ))}
            </div>
          )}
        </div>

        {/* User section */}
        <div className="p-4 border-t border-[#c8ccd0]">
          <div className="flex items-center gap-2">
            {userAvatar ? (
              <img
                src={userAvatar}
                alt={userName}
                className="w-8 h-8 rounded-full"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-400 to-indigo-500 flex items-center justify-center text-sm font-medium text-white">
                {userName.charAt(0).toUpperCase()}
              </div>
            )}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-700 truncate">{userName}</p>
              <p className="text-xs text-slate-400 truncate">{user.email}</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header
          className="shrink-0 px-4 py-3 flex items-center justify-between"
          style={{
            background: "var(--neu-bg)",
            boxShadow: "0 2px 8px rgba(200,204,208,0.5)",
          }}
        >
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 neu-btn cursor-pointer"
                title="Open sidebar"
              >
                <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            )}
            <h1 className="text-lg font-bold text-slate-700">
              BikinPRD <span className="font-normal text-slate-400 text-sm">AI Consultant</span>
            </h1>
          </div>

          <div className="flex items-center gap-2">
            {showGenerateButton && (
              <button
                onClick={generateFromChat}
                disabled={generating}
                className="px-4 py-2 neu-btn-primary text-sm font-medium cursor-pointer disabled:opacity-50 flex items-center gap-2"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
                </svg>
                Generate PRD
              </button>
            )}

            {generating && !prdContent && (
              <span className="text-sm text-indigo-600 flex items-center gap-2">
                <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Generating...
              </span>
            )}

            {prdContent && (
              <div className="flex items-center gap-1">
                <button
                  onClick={generateFromChat}
                  disabled={generating}
                  className="p-2 neu-btn cursor-pointer disabled:opacity-50"
                  title="Regenerate"
                >
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
                <button onClick={handleCopy} className="p-2 neu-btn cursor-pointer" title="Copy">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </button>
                <button onClick={handleDownload} className="p-2 neu-btn cursor-pointer" title="Download">
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </button>
                <button
                  onClick={() => setRightPanelOpen(!rightPanelOpen)}
                  className={`p-2 cursor-pointer ${rightPanelOpen ? "neu-inset" : "neu-btn"}`}
                  title="Toggle PRD panel"
                >
                  <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </button>
              </div>
            )}
          </div>
        </header>

        {/* Content Area: Chat + Right Panel */}
        <div className="flex-1 flex overflow-hidden">
          {/* Chat Center */}
          <div className="flex-1 flex flex-col min-w-0">
            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-4 py-6">
              <div className="max-w-2xl mx-auto space-y-4">
                {messages.map((msg, i) => (
                  <ChatMessage
                    key={i}
                    role={msg.role}
                    text={msg.text}
                    options={msg.options}
                    onOptionClick={(option) => sendMessage(option)}
                    disabled={loading || i !== messages.length - 1 || msg.role !== "model"}
                  />
                ))}
                {loading && <ChatMessage role="model" text="" loading />}
                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Input */}
            <div className="shrink-0 px-4 pb-4">
              <div className="max-w-2xl mx-auto">
                <div className="neu-inset p-2 flex items-end gap-2">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type your message... (Enter to send)"
                    rows={1}
                    className="flex-1 px-4 py-2.5 bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400 resize-none"
                  />
                  <button
                    onClick={() => sendMessage()}
                    disabled={!input.trim() || loading}
                    className="p-2.5 neu-btn-primary cursor-pointer disabled:opacity-40 shrink-0"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 12L3.269 3.126A59.768 59.768 0 0121.485 12 59.77 59.77 0 013.27 20.876L5.999 12zm0 0h7.5" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Right Panel: PRD Preview */}
          {rightPanelOpen && prdContent && (
            <div
              className="w-full lg:w-[50%] xl:w-[45%] shrink-0 border-l border-[#c8ccd0] flex flex-col overflow-hidden"
              style={{ background: "var(--neu-bg)" }}
            >
              {/* PRD Header */}
              <div className="shrink-0 px-4 py-3 border-b border-[#c8ccd0] flex items-center justify-between">
                <h2 className="text-sm font-bold text-slate-700 truncate">
                  {prdTitle}
                </h2>
                <button
                  onClick={() => setRightPanelOpen(false)}
                  className="p-1.5 rounded-lg hover:bg-[#dfe6ee] transition-colors cursor-pointer"
                >
                  <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              {/* PRD Content */}
              <div className="flex-1 overflow-y-auto p-6">
                <PRDPreview content={prdContent} />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { copyToClipboard, downloadAsMarkdown } from "@/lib/export";
import PRDPreview from "@/components/PRDPreview";

interface PRDViewerProps {
  prd: {
    id: string;
    title: string;
    content: string;
  };
}

export default function PRDViewer({ prd }: PRDViewerProps) {
  const router = useRouter();
  const [mode, setMode] = useState<"preview" | "edit">("preview");
  const [content, setContent] = useState(prd.content);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    const supabase = createClient();
    const { error } = await supabase
      .from("prds")
      .update({ content, updated_at: new Date().toISOString() })
      .eq("id", prd.id);

    if (error) {
      toast.error("Failed to save changes");
    } else {
      toast.success("Changes saved");
      setHasChanges(false);
    }
    setSaving(false);
  };

  const handleCopy = async () => {
    try {
      await copyToClipboard(content);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleDownload = () => {
    downloadAsMarkdown(prd.title, content);
    toast.success("Downloaded as .md file");
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this PRD?")) return;
    const supabase = createClient();
    const { error } = await supabase.from("prds").delete().eq("id", prd.id);
    if (error) {
      toast.error("Failed to delete PRD");
    } else {
      toast.success("PRD deleted");
      router.push("/");
    }
  };

  return (
    <div>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <button
            onClick={() => router.push("/")}
            className="text-sm text-slate-500 hover:text-slate-700 mb-1 flex items-center gap-1 cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            Back
          </button>
          <h1 className="text-2xl font-bold text-slate-700">{prd.title}</h1>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Mode Toggle */}
          <div className="neu-inset flex p-0.5 rounded-xl">
            <button
              onClick={() => setMode("preview")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                mode === "preview"
                  ? "neu-raised-sm text-slate-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Preview
            </button>
            <button
              onClick={() => setMode("edit")}
              className={`px-3 py-1.5 text-sm font-medium rounded-lg transition-all cursor-pointer ${
                mode === "edit"
                  ? "neu-raised-sm text-slate-700"
                  : "text-slate-500 hover:text-slate-700"
              }`}
            >
              Edit
            </button>
          </div>

          <button onClick={handleCopy} className="p-2 neu-btn cursor-pointer" title="Copy">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
            </svg>
          </button>
          <button onClick={handleDownload} className="p-2 neu-btn cursor-pointer" title="Download">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </button>
          <button onClick={handleDelete} className="p-2 neu-btn cursor-pointer hover:!bg-red-50" title="Delete">
            <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="neu-raised p-6 sm:p-8">
        {mode === "edit" ? (
          <div>
            <textarea
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                setHasChanges(true);
              }}
              className="w-full min-h-[600px] p-5 neu-inset font-mono text-sm text-slate-700 resize-y outline-none"
              spellCheck={false}
            />
            {hasChanges && (
              <div className="flex items-center justify-between mt-4">
                <span className="text-sm text-amber-600">Unsaved changes</span>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="px-4 py-2 neu-btn-primary text-sm font-medium cursor-pointer disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Save Changes"}
                </button>
              </div>
            )}
          </div>
        ) : (
          <PRDPreview content={content} />
        )}
      </div>
    </div>
  );
}

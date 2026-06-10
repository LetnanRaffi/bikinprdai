"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let initialized = false;

interface MermaidBlockProps {
  chart: string;
}

export default function MermaidBlock({ chart }: MermaidBlockProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [svg, setSvg] = useState<string>("");

  useEffect(() => {
    if (!initialized) {
      mermaid.initialize({
        startOnLoad: false,
        theme: "neutral",
        fontFamily: "inherit",
        er: { useMaxWidth: true },
        flowchart: { useMaxWidth: true },
        sequence: { useMaxWidth: true },
      });
      initialized = true;
    }

    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`;

    mermaid
      .render(id, chart.trim())
      .then(({ svg }) => {
        setSvg(svg);
        setError(null);
      })
      .catch((err) => {
        setError(err.message || "Failed to render diagram");
      });
  }, [chart]);

  if (error) {
    return (
      <div className="my-4">
        <div className="neu-inset p-4 text-sm text-slate-700 overflow-x-auto rounded-xl">
          <pre><code>{chart}</code></pre>
        </div>
        <p className="text-xs text-red-500 mt-1 px-2">{error}</p>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="my-4 flex justify-center neu-raised-sm p-5 overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

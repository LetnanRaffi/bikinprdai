"use client";

import { useEffect, useRef, useState } from "react";
import mermaid from "mermaid";

let initialized = false;

interface MermaidBlockProps {
  chart: string;
}

function sanitizeErDiagram(chart: string) {
  const lines = chart.split("\n");
  let inEntity = false;

  return lines
    .map((line) => {
      const trimmed = line.trim();

      if (!trimmed || trimmed.startsWith("%%")) return line;
      if (trimmed.endsWith("{")) {
        inEntity = true;
        return line;
      }
      if (trimmed === "}") {
        inEntity = false;
        return line;
      }
      if (!inEntity) return line;

      const indent = line.match(/^\s*/)?.[0] ?? "";
      const comment = trimmed.match(/"[^"]*"$/)?.[0] ?? "";
      const withoutComment = comment
        ? trimmed.slice(0, -comment.length).trim()
        : trimmed;
      const tokens = withoutComment.split(/\s+/);
      if (tokens.length < 2) return line;

      const keys: string[] = [];
      while (tokens.length > 2 && /^(PK|FK|UK)$/i.test(tokens[tokens.length - 1])) {
        keys.unshift(tokens.pop()!.toUpperCase());
      }

      const name = tokens.pop();
      const type = tokens.join("_").replace(/[^\w[\]()*-]/g, "_");
      return `${indent}${type} ${name}${keys.length ? ` ${keys.join(",")}` : ""}${
        comment ? ` ${comment}` : ""
      }`;
    })
    .join("\n");
}

function normalizeMermaidChart(chart: string) {
  let normalized = chart
    .trim()
    .replace(/^```(?:mermaid|textmermaid)?\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  normalized = normalized
    .replace(/^textmermaid\s*(?:version\s+\d+(?:\.\d+)*)?\s*\n/i, "")
    .replace(/^mermaid\s*\n/i, "")
    .trim();

  if (/^erDiagram\b/i.test(normalized)) {
    return sanitizeErDiagram(normalized);
  }

  return normalized;
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
    const normalizedChart = normalizeMermaidChart(chart);

    mermaid
      .render(id, normalizedChart)
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
          <pre><code>{normalizeMermaidChart(chart)}</code></pre>
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

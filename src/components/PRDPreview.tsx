"use client";

import dynamic from "next/dynamic";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const MermaidBlock = dynamic(() => import("@/components/MermaidBlock"), {
  ssr: false,
  loading: () => (
    <div className="my-4 h-48 neu-inset rounded-xl animate-pulse" />
  ),
});

interface PRDPreviewProps {
  content: string;
}

export default function PRDPreview({ content }: PRDPreviewProps) {
  return (
    <div className="prose prose-slate max-w-none prose-headings:text-slate-700 prose-p:text-slate-600 prose-li:text-slate-600 prose-strong:text-slate-700 prose-a:text-indigo-600 prose-code:text-slate-700 prose-code:bg-[#dfe6ee] prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-pre:bg-slate-800 prose-pre:text-slate-100 prose-table:border-[#c8ccd0]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-mermaid/.exec(className || "");
            if (match) {
              return <MermaidBlock chart={String(children).replace(/\n$/, "")} />;
            }
            return (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre({ children }) {
            const child = children as React.ReactElement<{ className?: string }>;
            if (
              child?.props?.className &&
              /language-mermaid/.test(child.props.className)
            ) {
              return <>{children}</>;
            }
            return <pre>{children}</pre>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}

"use client";

interface ChatMessageProps {
  role: "user" | "model";
  text: string;
  loading?: boolean;
  options?: string[];
  onOptionClick?: (option: string) => void;
  disabled?: boolean;
}

export default function ChatMessage({
  role,
  text,
  loading,
  options = [],
  onOptionClick,
  disabled = false,
}: ChatMessageProps) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[85%] flex flex-col gap-2 ${isUser ? "items-end" : "items-start"}`}>
        {/* Message Bubble */}
        <div
          className={`px-4 py-3 text-sm leading-relaxed ${
            isUser
              ? "neu-btn-primary rounded-2xl rounded-tr-sm"
              : "neu-raised-sm rounded-2xl rounded-bl-sm text-slate-700"
          }`}
        >
          {loading ? (
            <div className="flex items-center gap-1.5 py-1 px-2">
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:0ms]" />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:150ms]" />
              <span className="w-2 h-2 bg-indigo-400 rounded-full animate-bounce [animation-delay:300ms]" />
            </div>
          ) : (
            <div className="whitespace-pre-wrap">{text}</div>
          )}
        </div>

        {/* Option Chips */}
        {!loading && options.length > 0 && onOptionClick && (
          <div className="flex flex-wrap gap-2 mt-1">
            {options.map((option, i) => (
              <button
                key={i}
                onClick={() => onOptionClick(option)}
                disabled={disabled}
                className="neu-chip px-4 py-2 text-xs font-medium text-slate-600 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

"use client";

export type Source = { file: string; excerpt: string; similarity: number };

type ChatMessageProps = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

export function ChatMessage({ role, content, sources }: ChatMessageProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end mb-4">
        <div className="max-w-[75%] bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm">
          {content}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-start mb-4">
      <div className="max-w-[85%] bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-800 whitespace-pre-wrap shadow-sm">
        {content}
      </div>
      {sources && sources.length > 0 && (
        <div className="mt-2 max-w-[85%] space-y-1.5">
          <p className="text-xs text-slate-500 font-medium px-1">Sources</p>
          {sources.map((source, i) => (
            <div
              key={i}
              className="bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs text-slate-600"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-medium text-slate-700 truncate">{source.file}</span>
                <span className="text-slate-400 ml-2 shrink-0">
                  {Math.round(source.similarity * 100)}% match
                </span>
              </div>
              <p className="text-slate-500 line-clamp-2">{source.excerpt}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

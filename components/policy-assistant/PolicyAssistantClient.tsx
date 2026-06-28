"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { apiPost } from "@/lib/apiClient";
import { ChatMessage, type Source } from "./ChatMessage";
import { DocumentUpload } from "./DocumentUpload";

type Message = {
  role: "user" | "assistant";
  content: string;
  sources?: Source[];
};

type QueryResponse = {
  success: boolean;
  data: { answer: string; sources: Source[] };
};

export default function PolicyAssistantClient() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const [messages, setMessages] = React.useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your Policy Assistant. Ask me questions about any uploaded CMS policy documents.",
    },
  ]);
  const [input, setInput] = React.useState("");
  const [loading, setLoading] = React.useState(false);
  const [activeTab, setActiveTab] = React.useState<"chat" | "documents">("chat");
  const scrollRef = React.useRef<HTMLDivElement>(null);

  const canUpload = role === "admin" || role === "clinic_staff";

  React.useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const question = input.trim();
    if (!question || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: question }]);
    setInput("");
    setLoading(true);

    try {
      const res = await apiPost<QueryResponse, { question: string }>("/api/rag/query", {
        question,
      });
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: res.data.answer, sources: res.data.sources },
      ]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            err instanceof Error ? err.message : "Failed to get an answer. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="bg-white border-b border-slate-200 px-6 py-4 shrink-0">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <h1 className="text-xl font-bold text-slate-900">Policy Assistant</h1>
        <p className="text-sm text-slate-500 mt-0.5">
          Ask questions about CMS policy documents
        </p>
      </div>

      {canUpload && (
        <div className="bg-white border-b border-slate-200 px-6 shrink-0">
          <div className="flex gap-1">
            {(["chat", "documents"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={[
                  "px-4 py-2.5 text-sm font-medium border-b-2 transition-colors",
                  activeTab === tab
                    ? "border-blue-600 text-primary"
                    : "border-transparent text-slate-500 hover:text-slate-700",
                ].join(" ")}
              >
                {tab === "chat" ? "Chat" : "Manage Documents"}
              </button>
            ))}
          </div>
        </div>
      )}

      {activeTab === "documents" && canUpload ? (
        <div className="flex-1 overflow-y-auto p-6 max-w-2xl w-full mx-auto">
          <DocumentUpload isAdmin={role === "admin"} />
        </div>
      ) : (
        <div className="flex flex-col flex-1 min-h-0">
          <div
            ref={scrollRef}
            className="flex-1 overflow-y-auto px-4 py-6 max-w-3xl w-full mx-auto"
          >
            {messages.map((msg, i) => (
              <ChatMessage
                key={i}
                role={msg.role}
                content={msg.content}
                sources={msg.sources}
              />
            ))}
            {loading && (
              <div className="flex items-start mb-4">
                <div className="bg-white border border-slate-200 rounded-2xl rounded-tl-sm px-4 py-3 text-sm text-slate-400 shadow-sm">
                  Thinking...
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => {
              void handleSubmit(e);
            }}
            className="border-t border-slate-200 bg-white px-4 py-4 shrink-0"
          >
            <div className="flex gap-2 max-w-3xl mx-auto">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about policy coverage, requirements, or guidelines..."
                className="flex-1 px-4 py-2.5 text-sm border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                disabled={loading}
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="px-4 py-2.5 bg-primary text-white text-sm font-medium rounded-xl hover:bg-primary-dark disabled:opacity-50 transition-colors"
              >
                Send
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

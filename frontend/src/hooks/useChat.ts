import { useState, useCallback } from "react";
import { fetchJson } from "@/lib/api";

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  content: string;
  timestamp: Date;
  error?: boolean;
}

interface ApiChatMessage {
  role: "user" | "model";
  content: string;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setLoading(true);

    try {
      // Build history for the API (exclude the message we just added)
      const history: ApiChatMessage[] = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      // Read API key from localStorage (set by user in ChatWidget)
      const geminiKey = (() => { try { return localStorage.getItem("sentinel_gemini_key") ?? ""; } catch { return ""; } })();

      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (geminiKey) headers["X-Gemini-Key"] = geminiKey;

      const response = await fetchJson<{ reply: string }>("/api/chat", {
        method: "POST",
        headers,
        body: JSON.stringify({
          message: trimmed,
          history,
        }),
      });

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "model",
        content: response.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      let errorText = "Could not reach the AI assistant.";
      if (err instanceof Error) {
        const msg = err.message;
        if (msg.includes("429") || msg.toLowerCase().includes("rate limit")) {
          errorText = "⏱️ Rate limit reached (free tier). Please wait ~60 seconds and try again.";
        } else if (msg.includes("401") || msg.toLowerCase().includes("invalid") && msg.toLowerCase().includes("key")) {
          errorText = "🔑 Invalid API key. Click the key icon in the header to update it.";
        } else if (msg.includes("503") || msg.toLowerCase().includes("no gemini")) {
          errorText = "🤖 No AI model available. Check your API key or try again later.";
        } else {
          errorText = msg;
        }
      }
      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "model",
        content: `⚠️ ${errorText}`,
        timestamp: new Date(),
        error: true,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setLoading(false);
    }
  }, [messages, loading]);

  const clearChat = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, loading, sendMessage, clearChat };
}

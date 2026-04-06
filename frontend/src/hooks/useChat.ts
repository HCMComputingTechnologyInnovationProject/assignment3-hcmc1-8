import { useCallback, useEffect, useRef, useState } from "react";
import { ApiError, fetchJson } from "@/lib/api";

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

const MAX_HISTORY_MESSAGES = 6;

function getStoredGeminiKey(): string {
  try {
    return localStorage.getItem("sentinel_gemini_key") ?? "";
  } catch {
    return "";
  }
}

function extractRetrySeconds(message: string): number | null {
  const match = message.match(/retry after(?: about)?\s+(\d+)\s*s/i);
  if (!match) return null;

  const seconds = Number(match[1]);
  return Number.isFinite(seconds) && seconds > 0 ? seconds : null;
}

export function useChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [cooldownUntil, setCooldownUntil] = useState<number | null>(null);
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const inFlightRef = useRef(false);
  const messagesRef = useRef<ChatMessage[]>([]);
  const requestVersionRef = useRef(0);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    if (!cooldownUntil) {
      setCooldownSeconds(0);
      return;
    }

    const updateCooldown = () => {
      const remaining = Math.max(0, Math.ceil((cooldownUntil - Date.now()) / 1000));
      setCooldownSeconds(remaining);
      if (remaining === 0) {
        setCooldownUntil(null);
      }
    };

    updateCooldown();
    const intervalId = window.setInterval(updateCooldown, 250);
    return () => window.clearInterval(intervalId);
  }, [cooldownUntil]);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || loading || inFlightRef.current) return;
    if (cooldownUntil && cooldownUntil > Date.now()) return;

    const userMsg: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
      timestamp: new Date(),
    };

    const history: ApiChatMessage[] = messagesRef.current
      .filter((m) => !m.error)
      .slice(-MAX_HISTORY_MESSAGES)
      .map((m) => ({
        role: m.role,
        content: m.content,
      }));

    const requestVersion = ++requestVersionRef.current;
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setMessages((prev) => {
      const next = [...prev, userMsg];
      messagesRef.current = next;
      return next;
    });
    inFlightRef.current = true;
    setLoading(true);

    try {
      const geminiKey = getStoredGeminiKey();
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (geminiKey) headers["X-Gemini-Key"] = geminiKey;

      const response = await fetchJson<{ reply: string }>("/api/chat", {
        method: "POST",
        headers,
        signal: controller.signal,
        body: JSON.stringify({
          message: trimmed,
          history,
        }),
      });

      if (requestVersionRef.current !== requestVersion) {
        return;
      }

      const aiMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "model",
        content: response.reply,
        timestamp: new Date(),
      };
      setMessages((prev) => {
        const next = [...prev, aiMsg];
        messagesRef.current = next;
        return next;
      });
    } catch (err: unknown) {
      if (
        controller.signal.aborted ||
        requestVersionRef.current !== requestVersion ||
        (err instanceof DOMException && err.name === "AbortError")
      ) {
        return;
      }

      let errorText = "Could not reach the AI assistant.";
      if (err instanceof ApiError) {
        const msg = err.message;
        const lowerMsg = msg.toLowerCase();

        if (err.status === 429 || lowerMsg.includes("rate limit")) {
          const retrySeconds = extractRetrySeconds(msg) ?? 60;
          setCooldownUntil(Date.now() + retrySeconds * 1000);
          errorText = `Rate limit reached on the Gemini free tier. Try again in about ${retrySeconds}s.`;
        } else if (err.status === 401 || (lowerMsg.includes("invalid") && lowerMsg.includes("key"))) {
          errorText = "Invalid API key. Click the key icon in the header to update it.";
        } else if (err.status === 503 || lowerMsg.includes("no gemini")) {
          errorText = "No AI model available. Check your API key or try again later.";
        } else {
          errorText = msg;
        }
      } else if (err instanceof Error) {
        errorText = err.message;
      }

      const errorMsg: ChatMessage = {
        id: crypto.randomUUID(),
        role: "model",
        content: `Warning: ${errorText}`,
        timestamp: new Date(),
        error: true,
      };
      setMessages((prev) => {
        const next = [...prev, errorMsg];
        messagesRef.current = next;
        return next;
      });
    } finally {
      if (requestVersionRef.current === requestVersion) {
        inFlightRef.current = false;
        setLoading(false);
        abortControllerRef.current = null;
      }
    }
  }, [cooldownUntil, loading]);

  const clearChat = useCallback(() => {
    requestVersionRef.current += 1;
    abortControllerRef.current?.abort();
    abortControllerRef.current = null;
    inFlightRef.current = false;
    messagesRef.current = [];
    setMessages([]);
    setLoading(false);
    setCooldownUntil(null);
    setCooldownSeconds(0);
  }, []);

  return { messages, loading, cooldownSeconds, sendMessage, clearChat };
}

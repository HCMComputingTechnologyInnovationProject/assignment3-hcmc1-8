import { useEffect, useRef, useState, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bot, Key, MessageSquare, Send, Trash2, X } from "lucide-react";
import { useChat } from "@/hooks/useChat";

const SUGGESTED_QUESTIONS = [
  "Fraud rate hiện tại như thế nào?",
  "Tại sao risk score lại cao?",
  "So sánh XGBoost và Random Forest?",
  "Giao dịch nào nguy hiểm nhất?",
];

function TypingIndicator() {
  return (
    <div className="flex items-end gap-2 justify-start">
      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
        <Bot className="w-3.5 h-3.5 text-primary" />
      </div>
      <div className="bg-card border border-border rounded-2xl rounded-bl-sm px-4 py-3">
        <div className="flex items-center gap-1.5">
          {[0, 1, 2].map((i) => (
            <span
              key={i}
              className="w-1.5 h-1.5 rounded-full bg-muted-foreground/60 animate-bounce"
              style={{ animationDelay: `${i * 0.15}s`, animationDuration: "0.9s" }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function MessageBubble({ role, content, error }: { role: "user" | "model"; content: string; error?: boolean }) {
  const isUser = role === "user";

  const renderContent = (text: string) => {
    return text.split("\n").map((line, i) => {
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      return (
        <p key={i} className={i > 0 ? "mt-1" : ""}>
          {parts.map((part, j) =>
            part.startsWith("**") && part.endsWith("**") ? (
              <strong key={j}>{part.slice(2, -2)}</strong>
            ) : (
              part
            )
          )}
        </p>
      );
    });
  };

  return (
    <div className={`flex items-end gap-2 ${isUser ? "justify-end" : "justify-start"}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0 mb-0.5">
          <Bot className="w-3.5 h-3.5 text-primary" />
        </div>
      )}
      <div
        className={`max-w-[82%] px-4 py-2.5 text-sm leading-relaxed rounded-2xl ${
          isUser
            ? "bg-primary text-primary-foreground rounded-br-sm"
            : error
            ? "bg-destructive/10 text-destructive border border-destructive/20 rounded-bl-sm"
            : "bg-card border border-border text-foreground rounded-bl-sm"
        }`}
      >
        {renderContent(content)}
      </div>
    </div>
  );
}

/** Reusable API Key form shown on first setup or when editing */
function ApiKeyForm({
  title,
  description,
  onSave,
  onCancel,
}: {
  title: string;
  description: string;
  onSave: (key: string) => void;
  onCancel?: () => void;
}) {
  const [value, setValue] = useState("");

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 px-6 py-8 text-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
        <Key className="w-7 h-7 text-primary" />
      </div>
      <div>
        <p className="font-bold text-foreground mb-1">{title}</p>
        <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
        <a
          href="https://aistudio.google.com/apikey"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-primary underline mt-1 inline-block"
        >
          aistudio.google.com → Copy key
        </a>
      </div>
      <div className="w-full space-y-2">
        <input
          type="password"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && value.trim() && onSave(value.trim())}
          placeholder="AIza..."
          autoFocus
          className="w-full px-3 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
        />
        <button
          onClick={() => value.trim() && onSave(value.trim())}
          disabled={!value.trim()}
          className="w-full py-2 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:bg-primary/90 transition-colors"
        >
          Save & Start Chatting
        </button>
        {onCancel && (
          <button
            onClick={onCancel}
            className="w-full py-1.5 rounded-lg text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
      <p className="text-[10px] text-muted-foreground">
        Saved in browser localStorage · Never sent anywhere except Gemini API
      </p>
    </div>
  );
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [editingKey, setEditingKey] = useState(false);

  // Read key from localStorage on mount
  const [storedKey, setStoredKey] = useState<string>(() => {
    try { return localStorage.getItem("sentinel_gemini_key") ?? ""; } catch { return ""; }
  });

  const hasApiKey = storedKey.length > 0 && !editingKey;

  const { messages, loading, sendMessage, clearChat } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isFirstOpen = messages.length === 0;

  useEffect(() => {
    if (open && hasApiKey) {
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [open, hasApiKey]);

  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, open, loading]);

  const handleSaveKey = (key: string) => {
    try {
      localStorage.setItem("sentinel_gemini_key", key);
      setStoredKey(key);
      setEditingKey(false);
    } catch { /* noop */ }
  };

  const handleSend = () => {
    if (!input.trim() || loading) return;
    sendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {/* Floating bubble */}
      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center transition-colors hover:bg-primary/90"
        aria-label="Open AI assistant"
      >
        <AnimatePresence mode="wait">
          {open ? (
            <motion.span key="close" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <X className="w-6 h-6" />
            </motion.span>
          ) : (
            <motion.span key="chat" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }} transition={{ duration: 0.15 }}>
              <MessageSquare className="w-6 h-6" />
            </motion.span>
          )}
        </AnimatePresence>
        {!open && messages.length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center">
            {messages.filter((m) => m.role === "model").length}
          </span>
        )}
      </motion.button>

      {/* Chat panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            key="chat-panel"
            initial={{ opacity: 0, y: 24, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.95 }}
            transition={{ duration: 0.25, ease: [0.25, 0.1, 0.25, 1] }}
            className="fixed bottom-24 right-6 z-50 w-[380px] h-[540px] bg-card border border-border rounded-2xl shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <Bot className="w-4 h-4 text-primary" />
                </div>
                <div>
                  <p className="text-sm font-bold text-foreground">SentinelAI Assistant</p>
                  <p className="text-[10px] text-muted-foreground">Gemini 1.5 Flash · Fraud Analytics AI</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {/* Change API key button — always visible when a key is stored */}
                {storedKey.length > 0 && !editingKey && (
                  <button
                    onClick={() => setEditingKey(true)}
                    title="Change API key"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                  >
                    <Key className="w-3.5 h-3.5" />
                  </button>
                )}
                {messages.length > 0 && !editingKey && (
                  <button
                    onClick={clearChat}
                    title="Clear conversation"
                    className="p-1.5 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => { setOpen(false); setEditingKey(false); }}
                  className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* API Key setup / edit form */}
            {!hasApiKey && (
              <ApiKeyForm
                title={editingKey ? "Change Gemini API Key" : "Enter Gemini API Key"}
                description={
                  editingKey
                    ? "Enter your new key below. The old key will be replaced."
                    : "Get a free key — no credit card required."
                }
                onSave={handleSaveKey}
                onCancel={editingKey ? () => setEditingKey(false) : undefined}
              />
            )}

            {/* Chat messages & input */}
            {hasApiKey && (
              <>
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 custom-scrollbar">
                  {isFirstOpen && (
                    <div className="flex items-end gap-2 justify-start">
                      <div className="w-7 h-7 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                        <Bot className="w-3.5 h-3.5 text-primary" />
                      </div>
                      <div className="max-w-[82%] px-4 py-2.5 text-sm leading-relaxed rounded-2xl rounded-bl-sm bg-card border border-border text-foreground">
                        <p>Xin chào! Tôi là <strong>SentinelAI Assistant</strong> 👋</p>
                        <p className="mt-1">Tôi có thể giúp bạn phân tích dữ liệu fraud, giải thích kết quả prediction, hay trả lời câu hỏi về ML.</p>
                      </div>
                    </div>
                  )}

                  {messages.map((msg) => (
                    <MessageBubble key={msg.id} role={msg.role} content={msg.content} error={msg.error} />
                  ))}

                  {loading && <TypingIndicator />}
                  <div ref={messagesEndRef} />
                </div>

                {/* Quick suggestions */}
                {isFirstOpen && !loading && (
                  <div className="px-4 pb-3 flex flex-wrap gap-1.5 shrink-0">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        onClick={() => sendMessage(q)}
                        className="px-2.5 py-1 rounded-full border border-border text-xs text-muted-foreground hover:border-primary/50 hover:text-primary transition-colors bg-secondary/50"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input area */}
                <div className="px-4 py-3 border-t border-border bg-secondary/10 shrink-0">
                  <div className="flex items-end gap-2">
                    <textarea
                      ref={inputRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Hỏi về fraud data, predictions, models..."
                      rows={1}
                      disabled={loading}
                      className="flex-1 resize-none bg-secondary border border-border rounded-xl px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary disabled:opacity-50 max-h-28 overflow-y-auto custom-scrollbar"
                      style={{ lineHeight: "1.5" }}
                    />
                    <button
                      onClick={handleSend}
                      disabled={!input.trim() || loading}
                      className="shrink-0 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1.5 text-right">
                    Enter để gửi · Shift+Enter xuống dòng
                  </p>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

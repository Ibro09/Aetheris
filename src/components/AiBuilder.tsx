import { useEffect, useMemo, useState } from "react";
import { Cpu, MessageSquarePlus, Send, Shield, Sparkles } from "lucide-react";

interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  timestamp: string;
  variant?: "normal" | "error";
}

interface ChatThread {
  id: string;
  title: string;
  lastMessage: string;
  updatedAt: string;
  messages: ChatMessage[];
}

interface AiBuilderProps {
  chatIdentity?: string;
  isWalletConnected?: boolean;
  onConnectWallet?: () => void;
}

const STORAGE_PREFIX = "aetheris-ai-builder-threads";

const starterThread: ChatThread = {
  id: "starter-thread",
  title: "AI Builder",
  lastMessage: "Ask about yield strategies, token agents, or portfolio optimization.",
  updatedAt: new Date().toISOString(),
  messages: [
    {
      id: "welcome-message",
      role: "assistant",
      text: "Welcome to AI Builder. Ask anything about yield strategies, token agents, or portfolio optimization.",
      timestamp: "10:04 AM",
    },
  ],
};

const makeStorageKey = (identity: string) =>
  `${STORAGE_PREFIX}:${identity.trim().toLowerCase() || "guest"}`;

const makeTimestamp = () =>
  new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });

const makeThreadId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;

const makeThreadTitle = (text: string) => {
  const title = text.trim().replace(/\s+/g, " ");
  return title.length > 36 ? `${title.slice(0, 36)}...` : title || "New chat";
};

const formatUpdated = (updatedAt: string) => {
  const updatedMs = new Date(updatedAt).getTime();
  if (Number.isNaN(updatedMs)) return "Now";

  const diffMinutes = Math.max(0, Math.floor((Date.now() - updatedMs) / 60000));
  if (diffMinutes < 1) return "Now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;

  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;

  return new Date(updatedAt).toLocaleDateString([], {
    month: "short",
    day: "numeric",
  });
};

const normalizeThread = (thread: ChatThread): ChatThread => ({
  ...thread,
  messages: Array.isArray(thread.messages)
    ? thread.messages.map((message) => ({
        ...message,
        variant: message.variant ?? "normal",
      }))
    : [],
  updatedAt: thread.updatedAt || new Date().toISOString(),
});

const loadThreads = (identity: string): ChatThread[] => {
  if (typeof window === "undefined") return [starterThread];

  try {
    const saved = window.localStorage.getItem(makeStorageKey(identity));
    if (!saved) return [starterThread];

    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed) || parsed.length === 0) return [starterThread];

    return parsed.map(normalizeThread);
  } catch (error) {
    console.error("Failed to load AI Builder chat history", error);
    return [starterThread];
  }
};

const parseResponseJson = async (response: Response) => {
  const responseBody = await response.text();
  if (!responseBody) return null;

  try {
    return JSON.parse(responseBody);
  } catch {
    throw new Error(responseBody || "AI Builder returned an invalid response.");
  }
};

export default function AiBuilder({
  chatIdentity = "guest",
  isWalletConnected = false,
  onConnectWallet,
}: AiBuilderProps) {
  const [threads, setThreads] = useState<ChatThread[]>(() =>
    loadThreads(chatIdentity),
  );
  const [selectedThread, setSelectedThread] = useState(
    () => loadThreads(chatIdentity)[0]?.id ?? starterThread.id,
  );
  const [draft, setDraft] = useState("");
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    const nextThreads = loadThreads(chatIdentity);
    setThreads(nextThreads);
    setSelectedThread(nextThreads[0]?.id ?? starterThread.id);
  }, [chatIdentity]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem(makeStorageKey(chatIdentity), JSON.stringify(threads));
  }, [chatIdentity, threads]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThread) ?? threads[0],
    [selectedThread, threads],
  );

  const messages = activeThread?.messages ?? [];

  const updateActiveThread = (
    updater: (thread: ChatThread) => ChatThread,
  ) => {
    setThreads((currentThreads) =>
      currentThreads.map((thread) =>
        thread.id === selectedThread ? updater(thread) : thread,
      ),
    );
  };

  const handleNewThread = () => {
    if (!isWalletConnected) return;

    const now = new Date().toISOString();
    const thread: ChatThread = {
      ...starterThread,
      id: makeThreadId(),
      title: "New chat",
      lastMessage: "Start a new AI Builder conversation.",
      updatedAt: now,
      messages: [
        {
          ...starterThread.messages[0],
          id: makeThreadId(),
          timestamp: makeTimestamp(),
        },
      ],
    };

    setThreads((currentThreads) => [thread, ...currentThreads]);
    setSelectedThread(thread.id);
  };

  const handleSend = async () => {
    const text = draft.trim();
    if (!isWalletConnected || !text || !activeThread || isSending) return;

    const now = new Date().toISOString();
    const userMessage: ChatMessage = {
      id: makeThreadId(),
      role: "user",
      text,
      timestamp: makeTimestamp(),
    };
    const historyForRequest = [...messages, userMessage];

    setDraft("");
    setIsSending(true);
    updateActiveThread((thread) => ({
      ...thread,
      title: thread.title === "New chat" || thread.id === "starter-thread"
        ? makeThreadTitle(text)
        : thread.title,
      lastMessage: text,
      updatedAt: now,
      messages: historyForRequest,
    }));

    try {
      const response = await fetch("/api/user/chat/respond", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: chatIdentity || "guest",
          message: text,
          history: messages,
          temperature: 0.7,
          maxTokens: 2048,
        }),
      });

      const data = await parseResponseJson(response);
      if (!response.ok || !data.success) {
        throw new Error(data?.error || "AI Builder failed to respond.");
      }

      const assistantMessage: ChatMessage = {
        id: data.nodeMessage?.id ?? makeThreadId(),
        role: "assistant",
        text: data.nodeMessage?.text ?? "No response received.",
        timestamp: makeTimestamp(),
      };

      updateActiveThread((thread) => ({
        ...thread,
        lastMessage: assistantMessage.text,
        updatedAt: new Date().toISOString(),
        messages: [...historyForRequest, assistantMessage],
      }));
    } catch (error: any) {
      console.error("AI Builder chat request failed:", error);

      const errorText =
        error?.message ||
        "I could not reach the AI Builder endpoint. Please try again.";
      const assistantMessage: ChatMessage = {
        id: makeThreadId(),
        role: "assistant",
        text: `Error: ${errorText}`,
        timestamp: makeTimestamp(),
        variant: "error",
      };

      updateActiveThread((thread) => ({
        ...thread,
        lastMessage: assistantMessage.text,
        updatedAt: new Date().toISOString(),
        messages: [...historyForRequest, assistantMessage],
      }));
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pt-24 px-4 sm:px-6 lg:px-10">
      <div className="max-w-[1550px] mx-auto grid grid-cols-1 xl:grid-cols-[320px_1fr] gap-6">
        <aside className="rounded-3xl border border-outline-variant/50 bg-surface/90 p-6 shadow-lg h-[70vh] overflow-y-auto custom-scrollbar">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <div className="text-xs font-mono uppercase tracking-[0.35em] text-secondary mb-2">
                AI Builder
              </div>
              <h2 className="text-2xl font-black tracking-tight text-primary">
                Chat Threads
              </h2>
            </div>
            <button
              type="button"
              onClick={handleNewThread}
              disabled={!isWalletConnected}
              className="grid place-items-center rounded-full bg-secondary/10 p-3 text-secondary transition hover:bg-secondary hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Start new chat"
              title={
                isWalletConnected
                  ? "Start new chat"
                  : "Login to start a chat"
              }
            >
              <MessageSquarePlus className="h-5 w-5" />
            </button>
          </div>

          <div className="space-y-3">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedThread(thread.id)}
                className={`w-full rounded-3xl border p-4 text-left transition-all duration-200 ${
                  selectedThread === thread.id
                    ? "border-secondary bg-secondary/5"
                    : "border-white/10 bg-transparent hover:border-white/20"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-sm font-semibold text-primary">
                    {thread.title}
                  </span>
                  <span className="shrink-0 text-[10px] uppercase tracking-[0.25em] text-on-surface-variant">
                    {formatUpdated(thread.updatedAt)}
                  </span>
                </div>
                <p className="mt-2 line-clamp-2 text-[13px] leading-5 text-on-surface-variant">
                  {thread.lastMessage}
                </p>
              </button>
            ))}
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-surface p-5">
            <div className="flex items-center gap-3 text-sm text-on-surface-variant">
              <Cpu className="h-4 w-4 text-secondary" />
              Smart conversation history
            </div>
            <p className="mt-3 text-xs leading-5 text-on-surface-variant/80">
              Threads are saved in local browser storage for now and restored
              when you come back.
            </p>
          </div>
        </aside>

        <section className="rounded-3xl border border-outline-variant/50 bg-surface/90 shadow-lg flex flex-col h-[70vh]">
          <div className="flex items-center justify-between gap-4 border-b border-white/10 p-6">
            <div>
              <p className="text-xs font-mono uppercase tracking-[0.35em] text-secondary">
                Aetheris AI Chat
              </p>
              <h1 className="text-3xl font-black tracking-tight text-primary">
                {activeThread?.title ?? "Talk to the Builder"}
              </h1>
            </div>
            <div className="hidden items-center gap-3 rounded-3xl bg-white/5 px-4 py-3 text-sm text-on-surface-variant sm:flex">
              <Shield className="h-4 w-4 text-secondary" />
              Secure Solana strategy assistant
            </div>
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto px-6 py-8 custom-scrollbar">
            {!isWalletConnected ? (
              <div className="grid h-full place-items-center">
                <div className="max-w-md rounded-3xl border border-outline-variant/50 bg-background/80 p-8 text-center shadow-sm">
                  <div className="mx-auto mb-5 grid h-12 w-12 place-items-center rounded-full bg-secondary/10 text-secondary">
                    <Shield className="h-5 w-5" />
                  </div>
                  <h2 className="text-2xl font-black tracking-tight text-primary">
                    Login Required
                  </h2>
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant">
                    Login or sign up before using AI Builder chat.
                  </p>
                  <button
                    type="button"
                    onClick={onConnectWallet}
                    className="mt-6 rounded-3xl bg-primary px-6 py-3 text-xs font-bold uppercase tracking-[0.25em] text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={!onConnectWallet}
                  >
                    Login / Sign Up
                  </button>
                </div>
              </div>
            ) : (
            <div className="space-y-4">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={`max-w-3xl rounded-3xl border p-5 shadow-sm ${
                    message.variant === "error"
                      ? "bg-error-container/60 border-error/30"
                      : message.role === "assistant"
                      ? "bg-surface border-white/10"
                      : "ml-auto border-secondary bg-secondary/5"
                  }`}
                >
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.35em] text-on-surface-variant">
                    <span>
                      {message.variant === "error"
                        ? "Error"
                        : message.role === "assistant"
                          ? "Aetheris"
                          : "You"}
                    </span>
                    <span>.</span>
                    <span>{message.timestamp}</span>
                  </div>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-on-background">
                    {message.text}
                  </p>
                </div>
              ))}
              {isSending ? (
                <div className="max-w-3xl rounded-3xl border border-white/10 bg-surface p-5 text-sm text-on-surface-variant shadow-sm">
                  <div className="flex items-center gap-3">
                    <Sparkles className="h-4 w-4 text-secondary" />
                    Aetheris is thinking...
                  </div>
                </div>
              ) : null}
            </div>
            )}
          </div>

          <div className="border-t border-white/10 p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    handleSend();
                  }
                }}
                rows={3}
                placeholder={
                  isWalletConnected
                    ? "Ask the AI Builder..."
                    : "Login to unlock AI Builder..."
                }
                disabled={!isWalletConnected}
                className="min-h-[44px] h-[44px] border-secondary bg-secondary/5 w-full resize-none rounded-3xl border border-white/10 bg-background/90 px-4 py-2 text-sm text-on-background placeholder:text-on-surface-variant outline-none transition-shadow focus:border-secondary focus:ring-2 focus:ring-secondary/20 disabled:cursor-not-allowed disabled:opacity-60"
              />
              <button
                onClick={handleSend}
                disabled={!isWalletConnected || isSending || !draft.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-3xl bg-primary px-6 py-4 text-sm font-bold uppercase tracking-[0.25em] text-white transition hover:bg-secondary disabled:cursor-not-allowed disabled:opacity-50"
              >
                Send
                <Send className="h-4 w-4" />
              </button>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

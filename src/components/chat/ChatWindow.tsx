"use client";

import { useEffect, useRef, useState } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";
import { ArrowLeftIcon, PaperAirplaneIcon, ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";

let socket: Socket | null = null;

type Message = {
  id: string;
  content: string;
  createdAt: string;
  author: { id: string; name: string | null };
  roomId?: string;
};

type ChatWindowProps = {
  roomId: string;
  roomName?: string;
  onBack?: () => void;
};

export function ChatWindow({ roomId, roomName, onBack }: ChatWindowProps) {
  const { data: session } = useSession();
  const meId = (session?.user as any)?.id as string | undefined;

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [showToast, setShowToast] = useState(false);
  const [lastSeenMessageId, setLastSeenMessageId] = useState<string | null>(null);

  const bottomRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Socket konekcija
  useEffect(() => {
    if (!session || !meId) return;

    if (!socket) {
      socket = io("/", {
        path: "/api/socket.io",
        auth: { userId: meId },
      });
    }

    socket.emit("join-room", roomId);

    const handleNewMessage = (msg: Message) => {
      if ((msg as any).roomId && (msg as any).roomId !== roomId) return;
      setMessages((prev) => [...prev, msg]);

      if (msg.author.id !== meId) {
        setShowToast(true);
        setTimeout(() => setShowToast(false), 3000);
        
        // Push notification za background
        if ("serviceWorker" in navigator && "Notification" in window) {
          navigator.serviceWorker.ready.then((registration) => {
            registration.showNotification(roomName ?? "Nova poruka", {
              body: `${msg.author.name ?? "Korisnik"}: ${msg.content.substring(0, 100)}`,
              icon: "/italgroup-logo.png",
              badge: "/italgroup-logo.png",
              tag: roomId,
              requireInteraction: false,
            });
          });
        }
      }
    };

    socket.on("new-message", handleNewMessage);

    return () => {
      socket?.off("new-message", handleNewMessage);
    };
  }, [roomId, session, meId, roomName]);

  // Učitaj postojeće poruke
  useEffect(() => {
    async function load() {
      if (!roomId) return;
      setLoading(true);
      const res = await fetch(`/api/chat/messages?roomId=${roomId}`);
      const data = await res.json();
      setMessages(data);
      if (data.length > 0) {
        setLastSeenMessageId(data[data.length - 1].id);
      }
      setLoading(false);
    }
    load();
  }, [roomId]);

  // Auto scroll na dno
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Auto resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 128)}px`;
    }
  }, [input]);

  const send = () => {
    if (!socket || !input.trim()) return;
    socket.emit("send-message", { roomId, content: input.trim() });
    setInput("");
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
    }
  };

  const isLastOwnMessage = (msgId: string) => {
    if (!meId) return false;
    const ownMessages = messages.filter((m) => m.author.id === meId);
    if (!ownMessages.length) return false;
    return ownMessages[ownMessages.length - 1].id === msgId;
  };

  const isSeen = (msgId: string) => {
    return (
      lastSeenMessageId === messages[messages.length - 1]?.id &&
      isLastOwnMessage(msgId)
    );
  };

  const formatMessageTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / (1000 * 60));
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (minutes < 1) return "Upravo sada";
    if (minutes < 60) return `Prije ${minutes}min`;
    if (hours < 24) return `Prije ${hours}h`;
    if (days === 1) return "Jučer";
    if (days < 7) return date.toLocaleDateString("bs-BA", { weekday: "short" });
    return date.toLocaleDateString("bs-BA", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getInitials = (name: string | null) => {
    if (!name) return "?";
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center bg-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-white md:rounded-2xl md:border md:border-slate-200 md:shadow-lg overflow-hidden">
      {/* Header - Poboljšan za desktop i mobile */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 p-3 md:p-4 flex-shrink-0 shadow-sm">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-lg transition active:scale-95"
            aria-label="Nazad"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-11 h-11 md:w-12 md:h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-full flex items-center justify-center text-white font-semibold text-sm shadow-md">
            {getInitials(roomName ?? "Chat")}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-semibold text-slate-900 truncate">
              {roomName ?? "Chat"}
            </h2>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
              Aktivan
            </p>
          </div>
        </div>
      </div>

      {/* Messages - Poboljšan spacing i design */}
      <div className="flex-1 overflow-y-auto bg-gradient-to-b from-slate-50 to-white p-3 md:p-6 space-y-3 md:space-y-4 min-h-0 scroll-smooth">
        {messages.length === 0 ? (
          <EmptyState
            icon={<ChatBubbleLeftRightIcon className="w-16 h-16 text-slate-300" />}
            title="Nema poruka"
            description="Pošaljite prvu poruku da započnete razgovor."
          />
        ) : (
          messages.map((m, index) => {
            const isMe = m.author.id === meId;
            const prevMessage = index > 0 ? messages[index - 1] : null;
            const showAvatar = !prevMessage || prevMessage.author.id !== m.author.id;
            const showDateSeparator =
              index === 0 ||
              new Date(m.createdAt).toDateString() !==
                new Date(prevMessage!.createdAt).toDateString();
            const isConsecutive = prevMessage && prevMessage.author.id === m.author.id;

            return (
              <div key={m.id}>
                {/* Date separator */}
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-6">
                    <div className="bg-white px-4 py-1.5 rounded-full border border-slate-200 text-xs text-slate-500 shadow-sm">
                      {new Date(m.createdAt).toLocaleDateString("bs-BA", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </div>
                  </div>
                )}

                <div
                  className={`flex items-end gap-2 ${
                    isMe ? "flex-row-reverse" : "flex-row"
                  } ${!isConsecutive ? "mt-4" : ""}`}
                >
                  {/* Avatar */}
                  {showAvatar && !isMe && (
                    <div className="flex-shrink-0 w-8 h-8 md:w-9 md:h-9 bg-gradient-to-br from-slate-400 to-slate-500 rounded-full flex items-center justify-center text-white text-xs font-semibold shadow-md">
                      {getInitials(m.author.name)}
                    </div>
                  )}
                  {showAvatar && isMe && <div className="w-8 md:w-9" />}

                  {/* Message bubble */}
                  <div
                    className={`flex flex-col max-w-[85%] md:max-w-[65%] ${
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    {!isMe && showAvatar && (
                      <span className="text-xs font-medium text-slate-600 mb-1 px-1">
                        {m.author.name ?? "Korisnik"}
                      </span>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-2.5 shadow-sm transition-all ${
                        isMe
                          ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md"
                          : "bg-white text-slate-900 rounded-bl-md border border-slate-200"
                      }`}
                    >
                      <p className="text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed">
                        {m.content}
                      </p>
                      <div
                        className={`mt-1.5 flex items-center gap-2 text-[10px] md:text-xs ${
                          isMe ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        <span>{formatMessageTime(m.createdAt)}</span>
                        {isMe && isLastOwnMessage(m.id) && (
                          <span className="text-[10px] md:text-xs">
                            {isSeen(m.id) ? "✓✓" : "✓"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Toast notification */}
      {showToast && (
        <div className="pointer-events-none absolute inset-x-0 bottom-20 md:bottom-24 flex justify-center z-20 animate-in fade-in duration-200">
          <div className="pointer-events-auto rounded-full bg-slate-900/90 backdrop-blur-sm px-4 py-2 text-xs text-white shadow-xl">
            📩 Nova poruka
          </div>
        </div>
      )}

      {/* Input - Poboljšan za mobile */}
      <div className="border-t border-slate-200 bg-white p-3 md:p-4 flex-shrink-0 shadow-lg">
        <div className="flex items-end gap-2 md:gap-3">
          <div className="flex-1 rounded-2xl border-2 border-slate-200 focus-within:border-blue-500 focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              placeholder="Napiši poruku..."
              rows={1}
              className="w-full resize-none rounded-2xl px-4 py-2.5 md:py-3 text-sm md:text-base focus:outline-none max-h-32 scrollbar-hide"
            />
          </div>
          <button
            onClick={send}
            disabled={!input.trim()}
            className="flex-shrink-0 p-3 md:p-3.5 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-md hover:shadow-lg active:scale-95"
            aria-label="Pošalji"
          >
            <PaperAirplaneIcon className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}
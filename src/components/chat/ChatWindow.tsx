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
  otherMemberOnline?: boolean;
  onRoomOpen?: () => void;
};

export function ChatWindow({ roomId, roomName, onBack, otherMemberOnline, onRoomOpen }: ChatWindowProps) {
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  // Učitaj postojeće poruke i označi kao pročitano
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
      try {
        await fetch("/api/chat/messages/read", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ roomId }),
        });
        onRoomOpen?.();
      } catch {
        onRoomOpen?.();
      }
    }
    load();
  }, [roomId, onRoomOpen]);

  // Auto scroll na dno
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  // Auto resize textarea
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = "auto";
      inputRef.current.style.height = `${Math.min(inputRef.current.scrollHeight, 120)}px`;
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
    if (minutes < 60) return `${minutes}min`;
    if (hours < 24) return `${hours}h`;
    if (days === 1) return "Jučer";
    if (days < 7) return date.toLocaleDateString("bs-BA", { weekday: "short" });
    return date.toLocaleDateString("bs-BA", {
      day: "2-digit",
      month: "2-digit",
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
      <div className="flex h-full items-center justify-center bg-gradient-to-br from-slate-50 to-white">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="relative flex h-full flex-col bg-gradient-to-br from-slate-50 to-white overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-slate-200 bg-white/80 backdrop-blur-sm p-4 md:p-5 flex-shrink-0 shadow-sm">
        {onBack && (
          <button
            onClick={onBack}
            className="md:hidden p-2 text-slate-600 hover:bg-slate-100 rounded-xl transition active:scale-95"
            aria-label="Nazad"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
        )}
        <div className="flex-1 flex items-center gap-3 min-w-0">
          <div className="flex-shrink-0 w-12 h-12 md:w-14 md:h-14 bg-gradient-to-br from-blue-600 to-blue-700 rounded-2xl flex items-center justify-center text-white font-bold text-base md:text-lg shadow-lg">
            {getInitials(roomName ?? "Chat")}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-base md:text-lg font-bold text-slate-900 truncate">
              {roomName ?? "Chat"}
            </h2>
            <p className="text-xs md:text-sm text-slate-500 flex items-center gap-1.5">
              {typeof otherMemberOnline === "boolean" ? (
                <>
                  <span
                    className={`w-2 h-2 rounded-full flex-shrink-0 ${
                      otherMemberOnline ? "bg-emerald-500 animate-pulse" : "bg-slate-300"
                    }`}
                  />
                  {otherMemberOnline ? "Online" : "Offline"}
                </>
              ) : (
                <>
                  <span className="w-2 h-2 bg-slate-300 rounded-full flex-shrink-0" />
                  Chat
                </>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 md:p-6 space-y-4 min-h-0 scroll-smooth"
      >
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
            const isConsecutive = prevMessage && prevMessage.author.id === m.author.id && 
              new Date(m.createdAt).getTime() - new Date(prevMessage.createdAt).getTime() < 300000; // 5 minuta

            return (
              <div key={m.id}>
                {/* Date separator */}
                {showDateSeparator && (
                  <div className="flex items-center justify-center my-6">
                    <div className="bg-white px-4 py-2 rounded-full border border-slate-200 text-xs font-medium text-slate-500 shadow-sm">
                      {new Date(m.createdAt).toLocaleDateString("bs-BA", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                      })}
                    </div>
                  </div>
                )}

                <div
                  className={`flex items-end gap-2 md:gap-3 ${
                    isMe ? "flex-row-reverse" : "flex-row"
                  } ${!isConsecutive ? "mt-4" : "mt-1"}`}
                >
                  {/* Avatar */}
                  {showAvatar && !isMe && (
                    <div className="flex-shrink-0 w-[30px] h-10 p-2.5 bg-gradient-to-br from-slate-400 to-slate-500 rounded-2xl flex items-center justify-center text-white text-xs font-bold shadow-md">
                      {getInitials(m.author.name)}
                    </div>
                  )}
                  {showAvatar && isMe && <div className="w-[30px]" />}

                  {/* Message bubble */}
                  <div
                    className={`flex flex-col max-w-[85%] md:max-w-[75%] lg:max-w-[65%] ${
                      isMe ? "items-end" : "items-start"
                    }`}
                  >
                    {!isMe && showAvatar && (
                      <span className="text-xs font-semibold text-slate-700 mb-1.5 px-1">
                        {m.author.name ?? "Korisnik"}
                      </span>
                    )}
                    <div
                      className={`rounded-2xl px-4 py-3 shadow-md transition-all ${
                        isMe
                          ? "bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-br-md"
                          : "bg-white text-slate-900 rounded-bl-md border border-slate-200"
                      }`}
                    >
                      <p className="text-sm md:text-base whitespace-pre-wrap break-words leading-relaxed">
                        {m.content}
                      </p>
                      <div
                        className={`mt-2 flex items-center gap-2 text-xs ${
                          isMe ? "text-blue-100" : "text-slate-400"
                        }`}
                      >
                        <span>{formatMessageTime(m.createdAt)}</span>
                        {isMe && isLastOwnMessage(m.id) && (
                          <span className="text-xs">
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
        <div className="pointer-events-none absolute inset-x-0 bottom-24 md:bottom-28 flex justify-center z-20 animate-in fade-in duration-200">
          <div className="pointer-events-auto rounded-full bg-slate-900/90 backdrop-blur-sm px-4 py-2 text-xs text-white shadow-xl">
            📩 Nova poruka
          </div>
        </div>
      )}

      {/* Input */}
      <div className="border-t border-slate-200 bg-white/80 backdrop-blur-sm p-4 md:p-5 flex-shrink-0 shadow-lg">
        <div className="flex items-end gap-3">
          <div className="flex-1 rounded-2xl border-2 border-slate-200 focus-within:border-blue-500 focus-within:ring-4 focus-within:ring-blue-500/10 transition-all bg-white">
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
              className="w-full resize-none rounded-2xl px-4 py-3 md:py-3.5 text-sm md:text-base focus:outline-none max-h-32 scrollbar-hide"
            />
          </div>
          <button
            onClick={send}
            disabled={!input.trim()}
            className="flex-shrink-0 p-3 md:p-4 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-2xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg hover:shadow-xl active:scale-95"
            aria-label="Pošalji"
          >
            <PaperAirplaneIcon className="w-5 h-5 md:w-6 md:h-6" />
          </button>
        </div>
      </div>
    </div>
  );
}

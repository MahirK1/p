"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChatBubbleLeftRightIcon, UserGroupIcon } from "@heroicons/react/24/outline";

type Room = {
  id: string;
  name?: string | null;
  type: "DIRECT" | "GROUP";
  updatedAt?: string;
  lastMessage?: {
    content: string;
    createdAt: string;
    author: { name: string | null };
  } | null;
};

export function ChatSidebar({
  selectedRoomId,
  onSelect,
  onRefresh,
}: {
  selectedRoomId?: string;
  onSelect: (roomId: string, roomName?: string) => void;
  onRefresh?: () => void; // NOVI PROP
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const loadRooms = async () => {
    setLoading(true);
    const res = await fetch("/api/chat/rooms");
    const data = await res.json();
    setRooms(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRooms();
    // Refresh rooms every 5 seconds to get latest messages
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  // Expose refresh function
  useEffect(() => {
    if (onRefresh) {
      // Store refresh function in a way that parent can call it
      (window as any).__chatSidebarRefresh = loadRooms;
    }
  }, [onRefresh]);

  const handleSelect = (room: Room) => {
    onSelect(
      room.id,
      room.name ?? (room.type === "GROUP" ? "Grupni chat" : "1-na-1")
    );
  };

  const formatTime = (dateString?: string) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString("bs-BA", {
        hour: "2-digit",
        minute: "2-digit",
      });
    } else if (days === 1) {
      return "Jučer";
    } else if (days < 7) {
      return date.toLocaleDateString("bs-BA", { weekday: "short" });
    } else {
      return date.toLocaleDateString("bs-BA", {
        day: "2-digit",
        month: "2-digit",
      });
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <aside className="flex h-full w-full md:w-80 flex-col bg-white border-r border-slate-200">
      {/* Header */}
      <div className="border-b border-slate-200 bg-slate-50 p-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-600 rounded-lg">
            <ChatBubbleLeftRightIcon className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Chat</h2>
            <p className="text-xs text-slate-500">
              Razgovori i poruke
            </p>
          </div>
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="md" />
          </div>
        ) : rooms.length === 0 ? (
          <EmptyState
            icon={<ChatBubbleLeftRightIcon className="w-12 h-12 text-slate-300" />}
            title="Nema razgovora"
            description="Još nema kreiranih chat soba. Razgovori će se pojaviti ovdje kada se počnu."
          />
        ) : (
          <div className="divide-y divide-slate-100">
            {rooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              const roomName = room.name ?? (room.type === "GROUP" ? "Grupni chat" : "1-na-1");
              
              return (
                <button
                  key={room.id}
                  onClick={() => handleSelect(room)}
                  className={`w-full px-4 py-3 text-left transition-colors ${
                    isSelected
                      ? "bg-blue-50 border-l-4 border-blue-600"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-white font-semibold text-sm ${
                        room.type === "GROUP"
                          ? "bg-purple-500"
                          : "bg-blue-600"
                      }`}
                    >
                      {room.type === "GROUP" ? (
                        <UserGroupIcon className="w-6 h-6" />
                      ) : (
                        <span>{getInitials(roomName)}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3
                          className={`text-sm font-semibold truncate ${
                            isSelected ? "text-blue-900" : "text-slate-900"
                          }`}
                        >
                          {roomName}
                        </h3>
                        {room.lastMessage && (
                          <span className="text-xs text-slate-400 flex-shrink-0">
                            {formatTime(room.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {room.lastMessage ? (
                        <p className="text-xs text-slate-500 line-clamp-2">
                          <span className="font-medium">
                            {room.lastMessage.author.name ?? "Korisnik"}:
                          </span>{" "}
                          {room.lastMessage.content}
                        </p>
                      ) : (
                        <p className="text-xs text-slate-400 italic">
                          Nema poruka još
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
"use client";

import { useEffect, useState } from "react";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { EmptyState } from "@/components/ui/EmptyState";
import { ChatBubbleLeftRightIcon, UserGroupIcon, MagnifyingGlassIcon, PlusIcon } from "@heroicons/react/24/outline";

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
  hideHeader = false,
  showCreateButton = false,
  onCreateClick,
}: {
  selectedRoomId?: string;
  onSelect: (roomId: string, roomName?: string) => void;
  onRefresh?: () => void;
  hideHeader?: boolean;
  showCreateButton?: boolean;
  onCreateClick?: () => void;
}) {
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");

  const loadRooms = async () => {
    setLoading(true);
    const res = await fetch("/api/chat/rooms");
    const data = await res.json();
    setRooms(data);
    setLoading(false);
  };

  useEffect(() => {
    loadRooms();
    const interval = setInterval(loadRooms, 5000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (onRefresh) {
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

  const filteredRooms = rooms.filter((room) => {
    if (!searchQuery) return true;
    const roomName = room.name ?? (room.type === "GROUP" ? "Grupni chat" : "1-na-1");
    return roomName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <aside className="flex h-full flex-col bg-white relative">
      {showCreateButton && onCreateClick && (
        <button
          onClick={onCreateClick}
          className="absolute top-4 right-4 z-20 p-2.5 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
          aria-label="Novi chat"
        >
          <PlusIcon className="w-5 h-5" />
        </button>
      )}
      {!hideHeader && (
        <div className="border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 md:p-5 flex-shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl shadow-md flex-shrink-0">
              <ChatBubbleLeftRightIcon className="w-5 h-5 md:w-6 md:h-6 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-bold text-slate-900">Poruke</h2>
              <p className="text-xs md:text-sm text-slate-500">
                {rooms.length} {rooms.length === 1 ? "razgovor" : "razgovora"}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="border-b border-slate-200 bg-gradient-to-br from-slate-50 to-white p-4 md:p-5 flex-shrink-0">
        <div className="relative">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Pretraži razgovore..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
          />
        </div>
      </div>

      {/* Rooms List */}
      <div className="flex-1 overflow-y-auto min-h-0 scroll-smooth">
        {loading ? (
          <div className="flex items-center justify-center p-8">
            <LoadingSpinner size="md" />
          </div>
        ) : filteredRooms.length === 0 ? (
          <EmptyState
            icon={<ChatBubbleLeftRightIcon className="w-12 h-12 text-slate-300" />}
            title={searchQuery ? "Nema rezultata" : "Nema razgovora"}
            description={searchQuery ? "Pokušajte sa drugim pretraživanjem" : "Još nema kreiranih chat soba. Razgovori će se pojaviti ovdje kada se počnu."}
          />
        ) : (
          <div className="p-2 space-y-1">
            {filteredRooms.map((room) => {
              const isSelected = selectedRoomId === room.id;
              const roomName = room.name ?? (room.type === "GROUP" ? "Grupni chat" : "1-na-1");
              
              return (
                <button
                  key={room.id}
                  onClick={() => handleSelect(room)}
                  className={`bg-blue w-full px-3 py-3 md:py-3.5 rounded-xl text-left transition-all duration-200 ${
                    isSelected
                      ? "bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg scale-[1.02]"
                      : "hover:bg-slate-50 text-slate-900 active:scale-[0.98]"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    {/* Avatar */}
                    <div
                      className={`flex-shrink-0 w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center font-bold text-sm md:text-base shadow-md ${
                        isSelected
                          ? "bg-blue-600/20 text-white"
                          : room.type === "GROUP"
                          ? "bg-gradient-to-br from-purple-500 to-purple-600 text-white"
                          : "bg-gradient-to-br from-blue-600 to-blue-700 text-white"
                      }`}
                    >
                      {room.type === "GROUP" ? (
                        <UserGroupIcon className="w-6 h-6 md:w-7 md:h-7" />
                      ) : (
                        <span>{getInitials(roomName)}</span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2 mb-1">
                        <h3
                          className={`text-sm md:text-base font-semibold truncate ${
                            isSelected ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {roomName}
                        </h3>
                        {room.lastMessage && (
                          <span className={`text-xs flex-shrink-0 ${
                            isSelected ? "text-white/80" : "text-slate-400"
                          }`}>
                            {formatTime(room.lastMessage.createdAt)}
                          </span>
                        )}
                      </div>
                      {room.lastMessage ? (
                        <p className={`text-xs md:text-sm line-clamp-2 break-words ${
                          isSelected ? "text-white/90" : "text-slate-500"
                        }`}>
                          <span className={isSelected ? "font-medium" : "font-medium text-slate-700"}>
                            {room.lastMessage.author.name ?? "Korisnik"}:
                          </span>{" "}
                          {room.lastMessage.content}
                        </p>
                      ) : (
                        <p className={`text-xs md:text-sm italic ${
                          isSelected ? "text-white/70" : "text-slate-400"
                        }`}>
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

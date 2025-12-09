"use client";

import { useState, useEffect, useRef } from "react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { PushNotificationButton } from "@/components/ui/PushNotificationButton";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { PlusIcon } from "@heroicons/react/24/outline";

type Commercial = {
  id: string;
  name: string;
  email: string;
};

export default function ManagerChatPage() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [selectedRoomName, setSelectedRoomName] = useState<string | undefined>();
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [commercials, setCommercials] = useState<Commercial[]>([]);
  const [loadingCommercials, setLoadingCommercials] = useState(false);
  const [creatingRoom, setCreatingRoom] = useState(false);
  const sidebarRefreshRef = useRef<(() => void) | null>(null);
  const { showToast } = useToast();

  const handleSelectRoom = (roomId: string, roomName?: string) => {
    setSelectedRoomId(roomId);
    setSelectedRoomName(roomName);
  };

  // Load commercials when modal opens
  useEffect(() => {
    if (showCreateModal && commercials.length === 0) {
      setLoadingCommercials(true);
      fetch("/api/users?role=COMMERCIAL")
        .then((res) => res.json())
        .then((data) => {
          setCommercials(data);
          setLoadingCommercials(false);
        })
        .catch(() => {
          showToast("Greška pri učitavanju komercijalista", "error");
          setLoadingCommercials(false);
        });
    }
  }, [showCreateModal, commercials.length, showToast]);

  const handleCreateRoom = async (commercialId: string) => {
    setCreatingRoom(true);
    try {
      const res = await fetch("/api/chat/rooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ commercialId }),
      });

      if (!res.ok) {
        throw new Error("Failed to create room");
      }

      const newRoom = await res.json();
      setShowCreateModal(false);
      
      // Refresh sidebar
      if (sidebarRefreshRef.current) {
        sidebarRefreshRef.current();
      } else {
        // Fallback: reload page or use window method
        window.location.reload();
      }

      // Select the new room
      const commercialName = commercials.find((c) => c.id === commercialId)?.name ?? "Komercijalista";
      setSelectedRoomId(newRoom.id);
      setSelectedRoomName(commercialName);
      
      showToast("Chat je kreiran!", "success");
    } catch (error) {
      showToast("Greška pri kreiranju chat-a", "error");
    } finally {
      setCreatingRoom(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-[calc(100vh-4rem)] gap-4 p-4">
      {/* Dodaj dugme za notifikacije */}
      <div className="md:hidden flex justify-end mb-2">
        <PushNotificationButton />
      </div>
      
      {/* Sidebar - full screen on mobile when no room selected */}
      <div
        className={`${
          selectedRoomId ? "hidden" : "flex"
        } md:flex w-full md:w-auto h-full`}
      >
        <div className="flex flex-col h-full w-full">
          {/* Header sa dugmetom za kreiranje */}
          <div className="border-b border-slate-200 bg-slate-50 p-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <div className="p-2 bg-blue-600 rounded-lg flex-shrink-0">
                  <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <h2 className="text-lg font-semibold text-slate-900 truncate">Chat</h2>
                  <p className="text-xs text-slate-500 truncate">
                    Razgovori i poruke
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(true)}
                className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex-shrink-0"
                aria-label="Novi chat"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* ChatSidebar bez header-a (jer smo ga prebacili gore) */}
          <div className="flex-1 overflow-hidden">
            <ChatSidebar
              selectedRoomId={selectedRoomId}
              onSelect={handleSelectRoom}
              onRefresh={() => {
                sidebarRefreshRef.current = () => {
                  // This will be set by ChatSidebar
                };
              }}
            />
          </div>
        </div>
      </div>

      {/* Chat Window - full screen on mobile when room selected */}
      <div
        className={`${
          selectedRoomId ? "flex" : "hidden"
        } md:flex flex-1 min-w-0 h-full`}
      >
        {selectedRoomId ? (
          <ChatWindow
            roomId={selectedRoomId}
            roomName={selectedRoomName}
            onBack={() => {
              setSelectedRoomId(undefined);
              setSelectedRoomName(undefined);
            }}
          />
        ) : (
          <div className="hidden md:flex h-full items-center justify-center text-sm text-slate-500 bg-slate-50 rounded-2xl border border-slate-200">
            <div className="text-center">
              <p className="font-medium text-slate-700 mb-1">Odaberi razgovor</p>
              <p className="text-xs text-slate-500">
                Klikni na sobu sa lijeve strane da započneš razgovor
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Modal za kreiranje chat-a */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Novi chat</h2>
                <p className="text-sm text-slate-500">Odaberi komercijalistu</p>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {loadingCommercials ? (
                <div className="flex items-center justify-center p-8">
                  <LoadingSpinner size="md" />
                </div>
              ) : commercials.length === 0 ? (
                <p className="text-sm text-slate-500 text-center p-4">
                  Nema komercijalista
                </p>
              ) : (
                <div className="space-y-2">
                  {commercials.map((commercial) => (
                    <button
                      key={commercial.id}
                      onClick={() => handleCreateRoom(commercial.id)}
                      disabled={creatingRoom}
                      className="w-full p-4 text-left rounded-lg border border-slate-200 hover:bg-slate-50 transition disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                          {commercial.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                            .slice(0, 2)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 truncate">
                            {commercial.name}
                          </p>
                          <p className="text-xs text-slate-500 truncate">
                            {commercial.email}
                          </p>
                        </div>
                        {creatingRoom && (
                          <LoadingSpinner size="sm" />
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
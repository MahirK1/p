"use client";

import { useState, useEffect, useRef } from "react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { PushNotificationButton } from "@/components/ui/PushNotificationButton";
import { useToast } from "@/components/ui/ToastProvider";
import { LoadingSpinner } from "@/components/ui/LoadingSpinner";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

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

      if (!res.ok) throw new Error("Failed to create room");

      const newRoom = await res.json();
      setShowCreateModal(false);
      
      if ((window as any).__chatSidebarRefresh) {
        (window as any).__chatSidebarRefresh();
      }

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
    <div className="fixed inset-0 md:static w-full h-full bg-slate-50 overflow-hidden pt-[var(--header-height,0)]">
      
      {/* GRID CONTAINER: Striktno dijeli ekran na 2 dijela na desktopu */}
      <div className="flex flex-col md:flex-row gap-0 md:gap-4 p-0 md:p-4 bg-slate-50" style={{ height: 'calc(100dvh - 4rem)' }}>
        
        {/* LIJEVA KOLONA - SIDEBAR */}
        <div className={`
          ${selectedRoomId ? "hidden md:flex" : "flex"} 
          h-full w-full bg-white md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-col
        `}>
          <ChatSidebar
            selectedRoomId={selectedRoomId}
            onSelect={handleSelectRoom}
            onRefresh={() => { sidebarRefreshRef.current = () => {}; }}
            showCreateButton={true}
            onCreateClick={() => setShowCreateModal(true)}
          />
        </div>

        {/* DESNA KOLONA - CHAT WINDOW */}
        <div className={`
          ${selectedRoomId ? "flex" : "hidden md:flex"} 
          h-full w-full bg-white md:rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex-col relative
        `}>
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
            <div className="flex flex-1 flex-col items-center justify-center text-center p-8 bg-slate-50/20">
              <div className="w-20 h-20 bg-white rounded-full shadow-sm flex items-center justify-center mb-4 text-blue-600 border border-slate-100">
                <ChatBubbleLeftRightIcon className="w-10 h-10" />
              </div>
              <h3 className="text-xl font-bold text-slate-900">Manager Chat</h3>
              <p className="text-slate-500 max-w-xs mt-2 text-sm leading-relaxed">
                Odaberite razgovor s lijeve strane da biste započeli komunikaciju.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {showCreateModal && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white rounded-3xl shadow-2xl w-full max-w-md max-h-[85vh] flex flex-col overflow-hidden border border-slate-100">
            <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
              <h2 className="text-lg font-bold text-slate-900">Novi razgovor</h2>
              <button 
                onClick={() => setShowCreateModal(false)} 
                className="p-2 hover:bg-white rounded-full transition shadow-sm border border-slate-100"
              >✕</button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {loadingCommercials ? (
                <div className="flex justify-center p-12"><LoadingSpinner size="md" /></div>
              ) : (
                commercials.map((commercial) => (
                  <button
                    key={commercial.id}
                    onClick={() => handleCreateRoom(commercial.id)}
                    disabled={creatingRoom}
                    className="w-full p-4 flex items-center gap-4 rounded-2xl border border-slate-50 hover:border-blue-200 hover:bg-blue-50/50 transition-all text-left group"
                  >
                    <div className="w-12 h-12 bg-blue-600 rounded-xl flex items-center justify-center text-white font-bold group-hover:scale-105 transition-transform">
                      {commercial.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 truncate">{commercial.name}</p>
                      <p className="text-xs text-slate-500 truncate">{commercial.email}</p>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
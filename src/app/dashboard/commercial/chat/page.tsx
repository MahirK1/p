"use client";

import { useState } from "react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { PushNotificationButton } from "@/components/ui/PushNotificationButton";

export default function CommercialChatPage() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [selectedRoomName, setSelectedRoomName] = useState<string | undefined>();

  const handleSelectRoom = (roomId: string, roomName?: string) => {
    setSelectedRoomId(roomId);
    setSelectedRoomName(roomName);
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
        <ChatSidebar
          selectedRoomId={selectedRoomId}
          onSelect={handleSelectRoom}
        />
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
    </div>
  );
}
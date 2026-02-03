"use client";

import { useState } from "react";
import { ChatSidebar } from "@/components/chat/ChatSidebar";
import { ChatWindow } from "@/components/chat/ChatWindow";
import { PushNotificationButton } from "@/components/ui/PushNotificationButton";
import { ChatBubbleLeftRightIcon } from "@heroicons/react/24/outline";

export default function CommercialChatPage() {
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>();
  const [selectedRoomName, setSelectedRoomName] = useState<string | undefined>();

  const handleSelectRoom = (roomId: string, roomName?: string) => {
    setSelectedRoomId(roomId);
    setSelectedRoomName(roomName);
  };

  return (
    <div className="flex flex-col md:flex-row gap-0 md:gap-4 p-0 md:p-4 bg-slate-50" style={{ height: 'calc(100dvh - 4rem)' }}>
      {/* Mobile notification button */}
      <div className="md:hidden flex justify-end p-4 pb-2 bg-white border-b border-slate-200">
        <PushNotificationButton />
      </div>

      {/* Desktop Sidebar - flex basis, always visible */}
      <div className="hidden md:flex md:flex-[0_0_320px] lg:flex-[0_0_360px] h-full flex-shrink-0">
        <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <ChatSidebar
            selectedRoomId={selectedRoomId}
            onSelect={handleSelectRoom}
          />
        </div>
      </div>

      {/* Mobile Sidebar - full screen when no room selected */}
      <div
        className={`${
          selectedRoomId ? "hidden" : "flex"
        } md:hidden w-full h-full flex-shrink-0 min-w-0`}
      >
        <div className="w-full h-full bg-white overflow-hidden">
          <ChatSidebar
            selectedRoomId={selectedRoomId}
            onSelect={handleSelectRoom}
          />
        </div>
      </div>

      {/* Desktop Chat Window - flex-1, always visible */}
      <div className="hidden md:flex flex-1 h-full flex-shrink-0 min-w-[400px]">
        {selectedRoomId ? (
          <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <ChatWindow
              roomId={selectedRoomId}
              roomName={selectedRoomName}
              onBack={() => {
                setSelectedRoomId(undefined);
                setSelectedRoomName(undefined);
              }}
            />
          </div>
        ) : (
          <div className="w-full h-full bg-white rounded-2xl border border-slate-200 shadow-sm flex items-center justify-center">
            <div className="text-center max-w-sm px-6">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-100 to-blue-200 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-600" />
              </div>
              <p className="font-semibold text-slate-700 mb-2 text-base">Odaberi razgovor</p>
              <p className="text-sm text-slate-500">
                Klikni na sobu sa lijeve strane da započneš razgovor
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Mobile Chat Window - full screen when room selected */}
      <div
        className={`${
          selectedRoomId ? "flex" : "hidden"
        } md:hidden w-full h-full flex-shrink-0 min-w-0`}
      >
        {selectedRoomId && (
          <div className="w-full h-full bg-white overflow-hidden">
            <ChatWindow
              roomId={selectedRoomId}
              roomName={selectedRoomName}
              onBack={() => {
                setSelectedRoomId(undefined);
                setSelectedRoomName(undefined);
              }}
            />
          </div>
        )}
      </div>
    </div>
  );
}

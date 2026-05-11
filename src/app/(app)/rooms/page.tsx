"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import RoomGrid from "@/components/RoomGrid";
import { useAppContext } from "@/contexts/AppContext";

export default function RoomsPage() {
  const roomsOverview = useQuery(api.entries.getRoomsOverview);
  const { activeRoom, onOpenRoomTimeline } = useAppContext();

  return (
    <>
      {/* Section Header */}
      <div className="px-4 pt-4 pb-2 flex items-center justify-between">
        <h2 className="text-sm font-bold text-slate-500 uppercase tracking-wider">My Rooms</h2>
        <span className="text-xs text-slate-400">
          {roomsOverview ? roomsOverview.length : 0} {roomsOverview && roomsOverview.length === 1 ? "room" : "rooms"}
        </span>
      </div>
      <RoomGrid
        rooms={roomsOverview || []}
        activeRoom={activeRoom}
        onSelectRoom={onOpenRoomTimeline}
        onAddRoom={() => {}}
      />
    </>
  );
}

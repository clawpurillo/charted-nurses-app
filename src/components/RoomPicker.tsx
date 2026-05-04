"use client";

interface RoomPickerProps {
  rooms: string[];
  activeRoom: string | null;
  onSelectRoom: (room: string) => void;
  onAddRoom: (room: string) => void;
}

export default function RoomPicker({
  rooms,
  activeRoom,
  onSelectRoom,
  onAddRoom,
}: RoomPickerProps) {
  const handleAddRoom = () => {
    const room = window.prompt("Enter room number:");
    if (room) {
      const trimmed = room.trim().toUpperCase();
      if (trimmed) onAddRoom(trimmed);
    }
  };

  return (
    <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
      {rooms.map((room) => (
        <button
          key={room}
          id={`room-pill-${room}`}
          onClick={() => onSelectRoom(room)}
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 ${
            activeRoom === room
              ? "bg-slate-900 text-white shadow-md scale-105"
              : "bg-slate-100 text-slate-600 hover:bg-slate-200"
          }`}
        >
          {room}
        </button>
      ))}
      <button
        id="add-room-pill-btn"
        onClick={handleAddRoom}
        className="shrink-0 px-4 py-2 rounded-full text-sm font-medium text-slate-400 border-2 border-dashed border-slate-200 hover:border-slate-400 hover:text-slate-600 transition"
      >
        + Room
      </button>
    </div>
  );
}

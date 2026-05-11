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
          className={`shrink-0 px-4 py-2 rounded-full text-sm font-semibold transition-all duration-150 min-h-[48px] ${
            activeRoom === room
              ? "bg-brand text-white shadow-md shadow-brand/30 scale-105 active:scale-95"
              : "bg-slate-100 dark:bg-slate-700 text-text-secondary hover:bg-slate-200 dark:hover:bg-slate-600"
          }`}
        >
          {room}
        </button>
      ))}
      <button
        id="add-room-pill-btn"
        onClick={handleAddRoom}
        className="shrink-0 px-4 py-2 rounded-full text-sm font-medium text-text-muted border-2 border-dashed border-brand/30 hover:border-brand hover:text-brand transition min-h-[48px]"
        aria-label="Add room"
      >
        + Room
      </button>
    </div>
  );
}

import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

interface Entry {
  _id: string;
  room: string;
  description: string;
  entryType: "text" | "voice";
  timestamp: number;
  shiftDate: string;
  shiftType: "day" | "night";
  fdarCategory?: "focus" | "data" | "action" | "response";
}

interface RoomFdar {
  room: string;
  fdar: string;
}

function buildPrompt(room: string, entries: Entry[]): string {
  const sorted = [...entries].sort((a, b) => a.timestamp - b.timestamp);
  const lines = sorted.map((e) => {
    const time = new Date(e.timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
    const typeTag = e.entryType === "voice" ? "[voice] " : "";
    return `  ${time} — ${typeTag}${e.description}`;
  });

  return `You are a clinical documentation assistant helping nurses compile FDAR (Focus-Data-Action-Response) notes.

Below are diary-style nursing entries for Room ${room} during a ${sorted[0] ? (new Date(sorted[0].timestamp).getHours() >= 7 && new Date(sorted[0].timestamp).getHours() < 19 ? "day" : "night") : ""} shift.

Raw nursing diary entries for Room ${room}:
${lines.join("\n")}

Write a professional FDAR note for Room ${room} based on these entries.

Rules:
- Focus: The primary concern or reason for nursing intervention
- Data: Objective and subjective observations/findings
- Action: Nursing interventions performed
- Response: Patient response to interventions / current status
- Write in concise clinical language
- Do NOT invent details not present in the entries
- Keep each section to 1-3 sentences
- Do not include patient names (HIPAA-safe)

Format your response EXACTLY like this (no extra text before or after):
Focus: [text]
Data: [text]
Action: [text]
Response: [text]`;
}

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const body = await request.json();
    const { entries, shiftDate, shiftType } = body as {
      entries: Entry[];
      shiftDate: string;
      shiftType: string;
    };

    if (!entries || entries.length === 0) {
      return NextResponse.json(
        { error: "No entries provided" },
        { status: 400 }
      );
    }

    // Group entries by room
    const byRoom = entries.reduce((acc, entry) => {
      if (!acc[entry.room]) acc[entry.room] = [];
      acc[entry.room].push(entry);
      return acc;
    }, {} as Record<string, Entry[]>);

    const rooms = Object.keys(byRoom).sort();

    // Compile FDAR for each room in parallel
    const results = await Promise.all(
      rooms.map(async (room): Promise<RoomFdar> => {
        try {
          const prompt = buildPrompt(room, byRoom[room]);

          const completion = await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: prompt }],
            temperature: 0.2,
            max_tokens: 400,
          });

          const fdar = completion.choices[0]?.message?.content?.trim() ?? "";
          return { room, fdar };
        } catch (err: unknown) {
          console.error(`Failed to compile FDAR for room ${room}:`, err);
          return {
            room,
            fdar: `Focus: See entries below\nData: ${byRoom[room].length} entries recorded\nAction: Documentation compiled from shift diary\nResponse: Please review raw entries`,
          };
        }
      })
    );

    return NextResponse.json({
      rooms: results,
      shiftDate,
      shiftType,
      compiledAt: new Date().toISOString(),
    });
  } catch (error: unknown) {
    console.error("compile-fdar error:", error);
    return NextResponse.json(
      { error: "Failed to compile FDAR notes", details: (error as Error).message },
      { status: 500 }
    );
  }
}

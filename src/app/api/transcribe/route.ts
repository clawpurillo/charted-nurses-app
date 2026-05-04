import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

function getTokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "Service configuration error" },
        { status: 500 }
      );
    }

    const contentType = request.headers.get("content-type");
    if (!contentType || !contentType.startsWith("audio/")) {
      return NextResponse.json(
        { error: "Invalid content type. Expected audio/*" },
        { status: 400 }
      );
    }

    const audioBuffer = await request.arrayBuffer();

    if (audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "No audio data provided" },
        { status: 400 }
      );
    }

    if (audioBuffer.byteLength > 25 * 1024 * 1024) {
      return NextResponse.json(
        { error: "Audio file too large. Maximum size is 25MB" },
        { status: 413 }
      );
    }

    const start = Date.now();

    const file = new File([audioBuffer], "audio.webm", { type: "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en",
    });

    return NextResponse.json({
      text: transcription.text || "",
      language: "en",
      duration: 0,
      transcribeTime: (Date.now() - start) / 1000,
    });
  } catch (error: unknown) {
    console.error("Transcribe API error:", error);
    return NextResponse.json(
      { error: "Transcription failed" },
      { status: 500 }
    );
  }
}

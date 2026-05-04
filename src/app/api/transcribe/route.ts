import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export async function POST(request: NextRequest) {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json(
        { error: "OpenAI API key not configured" },
        { status: 500 }
      );
    }

    const audioBuffer = await request.arrayBuffer();

    if (audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "No audio data provided" },
        { status: 400 }
      );
    }

    const start = Date.now();

    // Use Next.js native File object to send to OpenAI
    const file = new File([audioBuffer], "audio.webm", { type: "audio/webm" });

    const transcription = await openai.audio.transcriptions.create({
      file,
      model: "whisper-1",
      language: "en", // Optional, but improves accuracy/speed for English
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
      { error: "Internal server error", details: (error as Error).message },
      { status: 500 }
    );
  }
}

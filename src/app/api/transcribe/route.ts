import { NextRequest, NextResponse } from "next/server";
import { execFile } from "child_process";
import { promisify } from "util";
import * as fs from "fs";
import * as os from "os";
import * as path from "path";

const execFileAsync = promisify(execFile);

// Whisper server URL — runs locally on the Mac Mini
const WHISPER_SERVER_URL = process.env.WHISPER_SERVER_URL || "http://localhost:9000";

async function convertToWav(buffer: Buffer): Promise<Buffer> {
  const tmpWav = path.join(os.tmpdir(), `transcribe-${Date.now()}.wav`);
  const tmpInput = path.join(os.tmpdir(), `transcribe-input-${Date.now()}`);
  
  try {
    await fs.promises.writeFile(tmpInput, buffer);
    await execFileAsync("ffmpeg", [
      "-i", tmpInput,
      "-ar", "16000",
      "-ac", "1",
      "-f", "wav",
      "-y",
      tmpWav,
    ]);
    
    return await fs.promises.readFile(tmpWav);
  } finally {
    await Promise.allSettled([
      fs.promises.unlink(tmpInput).catch(() => {}),
      fs.promises.unlink(tmpWav).catch(() => {}),
    ]);
  }
}

export async function POST(request: NextRequest) {
  try {
    const audioBuffer = await request.arrayBuffer();

    if (audioBuffer.byteLength === 0) {
      return NextResponse.json(
        { error: "No audio data provided" },
        { status: 400 }
      );
    }

    // Convert to WAV (handles webm/opus, mp4, ogg, etc.)
    const wavBuffer = await convertToWav(Buffer.from(audioBuffer));

    // Forward to whisper server as WAV
    const response = await fetch(`${WHISPER_SERVER_URL}/transcribe`, {
      method: "POST",
      headers: {
        "Content-Type": "audio/wav",
      },
      body: wavBuffer.buffer as ArrayBuffer,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Whisper server error:", response.status, errorText);
      return NextResponse.json(
        { error: "Transcription failed", details: errorText },
        { status: 502 }
      );
    }

    const result = await response.json();

    return NextResponse.json({
      text: result.text || "",
      language: result.language || "en",
      duration: result.duration || 0,
      transcribeTime: result.transcribe_time || 0,
    });
  } catch (error: any) {
    console.error("Transcribe API error:", error);
    return NextResponse.json(
      { error: "Internal server error", details: error.message },
      { status: 500 }
    );
  }
}

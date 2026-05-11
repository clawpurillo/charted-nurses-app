import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";

// ─── Config ────────────────────────────────────────────────
// Local whisper-server takes priority for local dev.
// Falls back to OpenAI cloud API when WHISPER_SERVER_URL is not set.

const WHISPER_SERVER_URL = process.env.WHISPER_SERVER_URL; // e.g. http://localhost:9000
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

// ─── Backend availability check ────────────────────────────

/** Returns which transcription backends are available. */
export function getAvailableBackends(): {
  local: boolean;
  openai: boolean;
  any: boolean;
} {
  return {
    local: !!WHISPER_SERVER_URL,
    openai: !!OPENAI_API_KEY,
    get any() {
      return this.local || this.openai;
    },
  };
}

function getTokenFromRequest(request: NextRequest): string | null {
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

// ─── Local whisper-server transcription ────────────────────

async function transcribeViaLocalServer(audioBuffer: ArrayBuffer): Promise<{
  text: string;
  language: string;
  duration: number;
  transcribeTime: number;
}> {
  if (!WHISPER_SERVER_URL) {
    throw new Error("WHISPER_SERVER_URL not configured");
  }

  const response = await fetch(`${WHISPER_SERVER_URL}/transcribe`, {
    method: "POST",
    headers: {
      "Content-Type": "audio/webm",
    },
    body: audioBuffer,
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    throw new Error(
      `Whisper server returned ${response.status}: ${errorBody || "unknown error"}`
    );
  }

  const data = await response.json();

  if (data.error) {
    throw new Error(data.error);
  }

  return {
    text: data.text || "",
    language: data.language || "en",
    duration: data.duration || 0,
    transcribeTime: data.transcribe_time || 0,
  };
}

// ─── OpenAI cloud Whisper fallback ─────────────────────────

async function transcribeViaOpenAI(audioBuffer: ArrayBuffer): Promise<{
  text: string;
  language: string;
  duration: number;
  transcribeTime: number;
}> {
  if (!OPENAI_API_KEY) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

  const file = new File([audioBuffer], "audio.webm", { type: "audio/webm" });

  const transcription = await openai.audio.transcriptions.create({
    file,
    model: "whisper-1",
    language: "en",
  });

  return {
    text: transcription.text || "",
    language: "en",
    duration: 0,
    transcribeTime: 0,
  };
}

// ─── 503 response with actionable guidance ─────────────────

function serviceUnavailableResponse(details?: string): NextResponse {
  const backends = getAvailableBackends();
  const missing: string[] = [];
  if (!backends.local) missing.push("WHISPER_SERVER_URL");
  if (!backends.openai) missing.push("OPENAI_API_KEY");

  return NextResponse.json(
    {
      error: "Voice transcription service is not configured",
      details: details || "No transcription backend is available.",
      missing_env: missing.length > 0 ? missing : undefined,
      help:
        missing.length > 0
          ? `Set at least one of: ${missing.join(", ")}. See .env.example for configuration options.`
          : undefined,
    },
    { status: 503 }
  );
}

// ─── POST /api/transcribe — transcribe audio ───────────────

export async function POST(request: NextRequest) {
  try {
    const token = getTokenFromRequest(request);
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

    // Fail early if no backend is configured at all
    const backends = getAvailableBackends();
    if (!backends.any) {
      return serviceUnavailableResponse(
        "Neither WHISPER_SERVER_URL nor OPENAI_API_KEY is configured. Voice transcription requires at least one backend."
      );
    }

    const start = Date.now();
    let result: Awaited<ReturnType<typeof transcribeViaLocalServer>>;
    let backend: "local" | "openai" = "openai";

    // Try local whisper-server first if configured
    if (backends.local) {
      try {
        result = await transcribeViaLocalServer(audioBuffer);
        backend = "local";
      } catch (localError) {
        const localMsg = (localError as Error).message;
        console.warn(
          `Local whisper-server failed (${localMsg}), falling back to OpenAI...`
        );

        // If OpenAI is also unavailable, return a detailed 503
        if (!backends.openai) {
          return serviceUnavailableResponse(
            `Local whisper-server is unreachable (${localMsg}) and OPENAI_API_KEY is not configured.`
          );
        }

        result = await transcribeViaOpenAI(audioBuffer);
        backend = "openai";
      }
    } else {
      // No local server configured — use OpenAI directly
      result = await transcribeViaOpenAI(audioBuffer);
      backend = "openai";
    }

    return NextResponse.json({
      text: result.text || "",
      language: result.language,
      duration: result.duration,
      transcribeTime: (Date.now() - start) / 1000,
      backend,
    });
  } catch (error: unknown) {
    console.error("Transcribe API error:", error);

    const message =
      error instanceof Error ? error.message : "Transcription failed";

    // Distinguish service misconfiguration from runtime errors
    if (
      message.includes("not configured") ||
      message.includes("OPENAI_API_KEY")
    ) {
      return serviceUnavailableResponse(message);
    }

    return NextResponse.json({ error: "Transcription failed" }, { status: 500 });
  }
}

// ─── GET /api/transcribe — health check ────────────────────

export async function GET() {
  const backends = getAvailableBackends();

  // Check local whisper-server reachability
  let localReachable: boolean | null = null;
  if (backends.local) {
    try {
      const resp = await fetch(`${WHISPER_SERVER_URL}/health`, {
        method: "GET",
        signal: AbortSignal.timeout(3000),
      });
      localReachable = resp.ok;
    } catch {
      localReachable = false;
    }
  }

  const status = backends.any ? 200 : 503;
  return NextResponse.json(
    {
      service: "voice-transcription",
      status: backends.any ? "available" : "unavailable",
      backends: {
        local: {
          configured: backends.local,
          reachable: localReachable,
          url: WHISPER_SERVER_URL || null,
        },
        openai: {
          configured: backends.openai,
        },
      },
    },
    { status }
  );
}

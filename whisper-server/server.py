"""
Whisper HTTP Server for Charted
Loads faster-whisper model once, serves /transcribe endpoint.
Usage: python server.py [--model large-v3] [--port 9000] [--device cpu]
"""

import argparse
import base64
import io
import os
import sys
import tempfile
import time
from http.server import HTTPServer, BaseHTTPRequestHandler
from typing import Optional

import numpy as np
from faster_whisper import WhisperModel

# ─── Config ──────────────────────────────────────────────────

MODEL_NAME = os.environ.get("WHISPER_MODEL", "large-v3")
PORT = int(os.environ.get("WHISPER_PORT", "9000"))
DEVICE = os.environ.get("WHISPER_DEVICE", "cpu")
COMPUTE_TYPE = os.environ.get("WHISPER_COMPUTE_TYPE", "int8")

# ─── Model Loading ───────────────────────────────────────────

print(f"Loading Whisper model: {MODEL_NAME} on {DEVICE} ({COMPUTE_TYPE})...", flush=True)
t0 = time.time()

model: Optional[WhisperModel] = None
try:
    model = WhisperModel(
        MODEL_NAME,
        device=DEVICE,
        compute_type=COMPUTE_TYPE,
        download_root=os.environ.get("WHISPER_CACHE", None),
    )
    print(f"Model loaded in {time.time() - t0:.1f}s", flush=True)
except Exception as e:
    print(f"ERROR: Failed to load model: {e}", flush=True)
    sys.exit(1)

# ─── Transcription Logic ─────────────────────────────────────

def transcribe_audio(audio_data: bytes, language: str = "en") -> dict:
    """Transcribe audio bytes and return result dict."""
    t_start = time.time()

    # Write to temp file for faster-whisper
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        f.write(audio_data)
        tmp_path = f.name

    try:
        segments, info = model.transcribe(
            tmp_path,
            language=language if language != "auto" else None,
            beam_size=5,
            best_of=3 if DEVICE == "cpu" else 1,
            vad_filter=True,  # Auto-detect speech segments
            vad_parameters={
                "min_silence_duration_ms": 500,
                "speech_pad_ms": 300,
            },
        )

        # Collect all segments
        full_text = " ".join(seg.text for seg in segments)
        full_text = full_text.strip()

        elapsed = time.time() - t_start
        audio_duration = info.duration

        return {
            "text": full_text,
            "language": info.language,
            "duration": round(audio_duration, 2),
            "transcribe_time": round(elapsed, 3),
            "realtime_factor": round(elapsed / audio_duration, 3) if audio_duration > 0 else 0,
        }
    finally:
        os.unlink(tmp_path)


def decode_base64_wav(b64_string: str) -> bytes:
    """Decode base64-encoded WAV audio."""
    # Remove data URI prefix if present
    if "," in b64_string:
        b64_string = b64_string.split(",", 1)[1]
    return base64.b64decode(b64_string)


# ─── HTTP Handler ────────────────────────────────────────────

class TranscribeHandler(BaseHTTPRequestHandler):
    """Handle transcription requests."""

    def log_message(self, format, *args):
        """Custom logging."""
        print(f"[{time.strftime('%H:%M:%S')}] {args[0]}", flush=True)

    def do_POST(self):
        """Handle POST /transcribe."""
        if self.path == "/transcribe":
            try:
                content_length = int(self.headers.get("Content-Length", 0))
                content_type = self.headers.get("Content-Type", "")

                # Read body
                body = self.rfile.read(content_length)

                # Handle different content types
                if "application/json" in content_type:
                    import json
                    data = json.loads(body)
                    audio_b64 = data.get("audio", "")
                    language = data.get("language", "en")
                    audio_bytes = decode_base64_wav(audio_b64)
                else:
                    # Raw audio bytes (WAV/WEBM/MP3)
                    audio_bytes = body
                    language = "en"

                # Transcribe
                result = transcribe_audio(audio_bytes, language)

                # Send response
                import json
                response = json.dumps(result)
                self.send_response(200)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(response)))
                self.end_headers()
                self.wfile.write(response.encode())

            except Exception as e:
                import traceback
                error_msg = f"Transcription failed: {str(e)}"
                print(f"ERROR: {error_msg}", flush=True)
                print(traceback.format_exc(), flush=True)
                import json
                response = json.dumps({"error": error_msg})
                self.send_response(500)
                self.send_header("Content-Type", "application/json")
                self.send_header("Content-Length", str(len(response)))
                self.end_headers()
                self.wfile.write(response.encode())

        elif self.path == "/health":
            response = '{"status": "ok", "model": "' + MODEL_NAME + '"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response.encode())

        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        """Handle GET requests."""
        if self.path == "/health":
            import json
            response = json.dumps({"status": "ok", "model": MODEL_NAME})
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(response)))
            self.end_headers()
            self.wfile.write(response.encode())
        else:
            self.send_response(404)
            self.end_headers()


# ─── Main ────────────────────────────────────────────────────

def main():
    parser = argparse.ArgumentParser(description="Whisper Transcription Server")
    parser.add_argument("--model", default=MODEL_NAME, help="Whisper model name")
    parser.add_argument("--port", type=int, default=PORT, help="Port to listen on")
    parser.add_argument("--device", default=DEVICE, help="Device (cpu/cuda/metal)")
    parser.add_argument("--compute-type", default=COMPUTE_TYPE, help="Compute type (int8/float16)")
    args = parser.parse_args()

    server = HTTPServer(("0.0.0.0", args.port), TranscribeHandler)
    print(f"\nWhisper server listening on 0.0.0.0:{args.port}", flush=True)
    print(f"Model: {args.model} | Device: {args.device} | Compute: {args.compute_type}", flush=True)
    print(f"Endpoints: POST /transcribe, GET /health\n", flush=True)

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down...", flush=True)
        server.server_close()


if __name__ == "__main__":
    main()

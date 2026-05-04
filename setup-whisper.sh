#!/bin/bash
# Charted Whisper Server Setup
# Run this on the Mac Mini to set up the whisper transcription server

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
WHISPER_DIR="$SCRIPT_DIR/whisper-server"
LAUNCHD_PLIST="$SCRIPT_DIR/deploy/launchd/com.charted.whisper-server.plist"
TARGET_PLIST="$HOME/Library/LaunchAgents/com.charted.whisper-server.plist"

echo "🎙️  Charted Whisper Server Setup"
echo "================================"

# 1. Create LaunchAgents directory if needed
mkdir -p "$HOME/Library/LaunchAgents"

# 2. Install Python dependencies
echo ""
echo "📦 Installing Python dependencies..."
cd "$WHISPER_DIR"
pip3 install -r requirements.txt
echo "✓ Dependencies installed"

# 3. Copy launchd plist
echo ""
echo "🔧 Installing launchd service..."
cp "$LAUNCHD_PLIST" "$TARGET_PLIST"
echo "✓ Service file installed to $TARGET_PLIST"

# 4. Load the service
echo ""
echo "🚀 Starting whisper server..."
launchctl unload "$TARGET_PLIST" 2>/dev/null || true
cp "$LAUNCHD_PLIST" "$TARGET_PLIST"
launchctl load "$TARGET_PLIST" 2>/dev/null || true
echo "✓ Service loaded"

# 5. Wait for server to start
echo ""
echo "⏳ Waiting for server to start (model loading takes ~60-100s)..."
for i in {1..120}; do
    if curl -s http://localhost:9000/health > /dev/null 2>&1; then
        echo "✓ Server is running!"
        break
    fi
    if [ $i -eq 120 ]; then
        echo "⚠️  Server didn't start within 120s. Check logs:"
        echo "   tail -f /tmp/whisper-server.log"
        exit 1
    fi
    sleep 1
done

# 6. Test transcription
echo ""
echo "🧪 Testing transcription..."
python3 -c "
import urllib.request
import json

# Create a simple test
req = urllib.request.Request(
    'http://localhost:9000/health',
    method='GET'
)
resp = urllib.request.urlopen(req)
data = json.loads(resp.read())
print(f'   Model: {data[\"model\"]}')
print(f'   Status: {data[\"status\"]}')
"

echo ""
echo "✅ Whisper server setup complete!"
echo ""
echo "📋 Management commands:"
echo "   Status:  launchctl list | grep charted"
echo "   Logs:    tail -f /tmp/whisper-server.log"
echo "   Stop:    launchctl unload $TARGET_PLIST"
echo "   Start:   launchctl load $TARGET_PLIST"
echo "   Restart: launchctl unload $TARGET_PLIST && launchctl load $TARGET_PLIST"

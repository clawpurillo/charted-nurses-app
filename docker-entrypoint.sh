#!/bin/sh
set -e

# Decode base64-encoded JWT private key if provided
if [ -n "$JWT_PRIVATE_KEY_B64" ]; then
  # Use printf to avoid adding extra newlines
  export JWT_PRIVATE_KEY=$(printf '%s' "$JWT_PRIVATE_KEY_B64" | base64 -d)
fi

echo "Starting Next.js server..."
exec node server.js

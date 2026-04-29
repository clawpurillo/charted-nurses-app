#!/bin/sh
set -e

# Decode base64-encoded JWT private key if provided
if [ -n "$JWT_PRIVATE_KEY_B64" ]; then
  export JWT_PRIVATE_KEY=$(echo "$JWT_PRIVATE_KEY_B64" | base64 -d)
fi

# If JWT_PRIVATE_KEY is set directly, use it as-is
# (no action needed, it's already in the environment)

echo "Starting Next.js server..."
exec node server.js

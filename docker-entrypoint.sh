#!/bin/sh
set -e

# Decode base64-encoded JWT private key if provided
if [ -n "$JWT_PRIVATE_KEY_B64" ]; then
  echo "Decoding JWT_PRIVATE_KEY from base64..."
  JWT_PRIVATE_KEY=$(printf '%s' "$JWT_PRIVATE_KEY_B64" | base64 -d 2>&1)
  if [ $? -eq 0 ]; then
    export JWT_PRIVATE_KEY
    echo "JWT_PRIVATE_KEY decoded successfully (length: ${#JWT_PRIVATE_KEY})"
  else
    echo "ERROR: Failed to decode JWT_PRIVATE_KEY" >&2
    exit 1
  fi
fi

echo "Starting Next.js server..."
exec node server.js

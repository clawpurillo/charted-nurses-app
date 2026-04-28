#!/usr/bin/env bash
set -euo pipefail

# Deploy Charted to Portainer via Docker Swarm stack
# Usage: ./deploy-app.sh --project charted --env prod --image 10.10.20.200:5000/charted:prod-latest --endpoint-id 1

PORTAINER_URL="${PORTAINER_URL:-https://portainer.japurillo.com}"
PORTAINER_TOKEN="${PORTAINER_TOKEN:-}"
PROJECT="charted"
ENV="prod"
IMAGE=""
ENDPOINT_ID="1"
REPLICAS="1"
HOST="charted.fridaybuilt.com"

while [[ $# -gt 0 ]]; do
  case $1 in
    --project) PROJECT="$2"; shift 2;;
    --env) ENV="$2"; shift 2;;
    --image) IMAGE="$2"; shift 2;;
    --endpoint-id) ENDPOINT_ID="$2"; shift 2;;
    --replicas) REPLICAS="$2"; shift 2;;
    --host) HOST="$2"; shift 2;;
    *) echo "Unknown option: $1"; exit 1;;
  esac
done

if [[ -z "$IMAGE" ]]; then
  echo "Error: --image is required"
  exit 1
fi

if [[ -z "$PORTAINER_TOKEN" ]]; then
  echo "Error: PORTAINER_TOKEN env var is required"
  exit 1
fi

STACK_NAME="charted${ENV:+-$ENV}"
echo "Deploying stack: $STACK_NAME"
echo "Image: $IMAGE"
echo "Host: $HOST"
echo "Replicas: $REPLICAS"
echo "Endpoint: $ENDPOINT_ID"

# Read the swarm YAML and substitute variables
YAML_FILE="$(cd "$(dirname "$0")/../swarm" && pwd)/charted.yml"
if [[ ! -f "$YAML_FILE" ]]; then
  echo "Error: Swarm YAML not found at $YAML_FILE"
  exit 1
fi

# Read env file if exists
ENV_FILE="$(cd "$(dirname "$0")/../env" && pwd)/${ENV}.env"
if [[ -f "$ENV_FILE" ]]; then
  echo "Loading env from: $ENV_FILE"
  set -a
  source "$ENV_FILE"
  set +a
fi

# Substitute variables in YAML
SWARM_YAML=$(envsubst < "$YAML_FILE")

# Check if stack exists
EXISTING=$(curl -s --header "X-Api-Key: $PORTAINER_TOKEN" \
  "$PORTAINER_URL/api/stacks" | python3 -c "
import sys, json
stacks = json.load(sys.stdin)
for s in stacks:
    if s.get('Name') == '$STACK_NAME':
        print(s['Id'])
        break
" 2>/dev/null || echo "")

if [[ -n "$EXISTING" ]]; then
  echo "Updating existing stack (ID: $EXISTING)"
  # Get current folder web URL
  FOLDER_URL=$(curl -s --header "X-Api-Key: $PORTAINER_TOKEN" \
    "$PORTAINER_URL/api/stacks/$EXISTING" | python3 -c "
import sys, json
stack = json.load(sys.stdin)
print(stack.get('AdditionalFiles', [None])[0] if stack.get('AdditionalFiles') else '')
" 2>/dev/null || echo "")

  curl -s --header "X-Api-Key: $PORTAINER_TOKEN" \
    --header "Content-Type: application/json" \
    --request PUT \
    --data "{\"stackFile\":\"$(echo "$SWARM_YAML" | python3 -c 'import sys; print(sys.stdin.read().replace(chr(10), chr(92)+chr(110)).replace(chr(34), chr(92)+chr(34)))')\",\"endpointId\":$ENDPOINT_ID}" \
    "$PORTAINER_URL/api/stacks/$EXISTING/file"
else
  echo "Creating new stack: $STACK_NAME"
  curl -s --header "X-Api-Key: $PORTAINER_TOKEN" \
    --header "Content-Type: application/json" \
    --request POST \
    --data "{\"name\":\"$STACK_NAME\",\"stackFile\":\"$(echo "$SWARM_YAML" | python3 -c 'import sys; print(sys.stdin.read().replace(chr(10), chr(92)+chr(110)).replace(chr(34), chr(92)+chr(34)))')\",\"endpointId\":$ENDPOINT_ID,\"type\":1}" \
    "$PORTAINER_URL/api/stacks/swarm/file"
fi

echo "Deployment complete: $STACK_NAME"
echo "URL: https://$HOST"

#!/usr/bin/env bash
set -euo pipefail

REGISTRY="${REGISTRY:-10.10.20.200:5000}"
IMAGE_NAME="${IMAGE_NAME:-charted}"
TAG="${TAG:-latest}"

echo "Building image: ${REGISTRY}/${IMAGE_NAME}:${TAG}"
docker build -t "${REGISTRY}/${IMAGE_NAME}:${TAG}" .

echo "Pushing to registry: ${REGISTRY}/${IMAGE_NAME}:${TAG}"
docker push "${REGISTRY}/${IMAGE_NAME}:${TAG}"

echo "Done. Image: ${REGISTRY}/${IMAGE_NAME}:${TAG}"

#!/bin/bash

# Deployment script for CEOBitch

set -e

echo "Building CEOBitch..."

# Build TypeScript
npm run build

# Build Docker image
docker build -t ceobitch:latest .

echo "Deployment ready!"
echo "Run with: docker-compose up -d"
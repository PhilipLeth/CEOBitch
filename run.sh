#!/bin/sh

set -eu

echo "Running verification chain..."

echo "1) Lint"
npm run lint

echo "2) Typecheck"
npx tsc --noEmit

echo "3) Unit tests"
npm run test:unit -- --passWithNoTests

echo "4) Integration tests"
npm run test:integration -- --passWithNoTests

echo "5) E2E tests"
npm run test:e2e -- --passWithNoTests

echo "6) Smoke script"
./scripts/smoke.sh

echo "All checks passed"


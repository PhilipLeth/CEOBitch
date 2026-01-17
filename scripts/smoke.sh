#!/bin/sh

set -eu

API_BASE="${API_BASE:-http://localhost:3000/api/owner}"

if ! curl -fsS "$API_BASE/metrics" >/dev/null; then
  echo "Smoke failed: API not reachable at $API_BASE"
  exit 1
fi

ORDER_ID="$(curl -fsS -X POST "$API_BASE/orders" \
  -H 'Content-Type: application/json' \
  -d '{"description":"smoke test: landing page"}' | \
  python3 -c "import sys, json; print(json.load(sys.stdin)['orderId'])")"

if [ -z "$ORDER_ID" ]; then
  echo "Smoke failed: orderId missing"
  exit 1
fi

MAX_WAIT=10
WAITED=0
STATUS=""

while [ "$WAITED" -lt "$MAX_WAIT" ]; do
  sleep 1
  WAITED=$((WAITED + 1))
  STATUS="$(curl -fsS "$API_BASE/orders/$ORDER_ID" | \
    python3 -c "import sys, json; print(json.load(sys.stdin)['order']['status'])")"
  
  if [ "$STATUS" = "completed" ]; then
    break
  fi
done

if [ "$STATUS" != "completed" ]; then
  echo "Smoke failed: order status is $STATUS after ${WAITED}s"
  exit 1
fi

echo "Smoke passed"


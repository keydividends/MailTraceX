#!/usr/bin/env bash
set -euo pipefail

BASE_URL_BACKEND=${BASE_URL_BACKEND:-http://localhost:4000}
BASE_URL_WEB=${BASE_URL_WEB:-http://localhost:3000}

echo "Running Mail TraceX smoke tests..."

check_http() {
  local url="$1"
  echo -n "Checking ${url} ... "
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 5 "$url" || true)
  if [ "$http_code" = "200" ]; then
    echo "OK (200)"
    return 0
  else
    echo "FAIL (status: ${http_code})"
    return 1
  fi
}

errors=0

# Backend health
if ! check_http "${BASE_URL_BACKEND}/_health"; then
  errors=$((errors+1))
fi

# Frontend root
if ! check_http "${BASE_URL_WEB}/"; then
  errors=$((errors+1))
fi

if [ "$errors" -ne 0 ]; then
  echo "Smoke tests failed with ${errors} error(s)."
  exit 2
fi

echo "Smoke tests passed. Backend and web are responding."

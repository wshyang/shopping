#!/bin/bash
set -eu
# dev.sh — one-command local dev (GREENFIELD §9)
# Runs on Bash 3.2+ (no associative arrays, no mapfile, no ${var,,})
# Usage: ./dev.sh  (installs deps if needed, starts WXT dev server)

if [ ! -d "node_modules" ]; then
  echo "[dev] Installing dependencies..."
  npm install
fi

if [ ! -f ".auth/storage-state.json" ]; then
  echo "[dev] Note: no .auth/storage-state.json — live recon features will not work (see docs/01-pdd-recon.md)"
fi

echo "[dev] Starting WXT dev server..."
npm run dev

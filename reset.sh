#!/usr/bin/env bash

# Function to kill a port if occupied
kill_port() {
  local PORT=$1
  if lsof -i TCP:${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Killing process on port ${PORT}..."
    sudo kill -9 $(lsof -i TCP:${PORT} -sTCP:LISTEN -t) || true
  else
    echo "No process listening on port ${PORT}."
  fi
}

# 1. Kill ports 3000 and 3001
kill_port 3000
kill_port 3001

# 2. Remove backend/dist
if [ -d "backend/dist" ]; then
  echo "Removing backend/dist..."
  rm -rf backend/dist
fi

# 3. Start backend dev server
echo "Starting backend dev server..."
zsh -c "cd backend && npm run serve:dev"

# 4. Remove frontend/.next
if [ -d "frontend/.next" ]; then
  echo "Removing frontend/.next..."
  rm -rf frontend/.next
fi

# 5. Start frontend dev server
echo "Starting frontend dev server..."
gnome-terminal -- zsh -c "cd frontend && npm run dev; exec zsh"

echo "Reset script completed."

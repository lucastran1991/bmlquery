#!/bin/bash

# Configuration
PROJECT_ROOT=$(pwd)
BACKEND_DIR="$PROJECT_ROOT/backend"
FRONTEND_DIR="$PROJECT_ROOT/frontend"
LOG_FILE="$PROJECT_ROOT/out.log"

echo "Deploying BML Query Generator..."
echo "Logs will be written to: $LOG_FILE"

# Ensure PM2 is installed
if ! command -v pm2 &> /dev/null; then
    echo "PM2 not found. Installing locally..."
    npm install pm2 -g
fi

# 1. Build Backend
echo "Building Backend..."
cd "$BACKEND_DIR"
go build -o bmlquery-backend
if [ $? -ne 0 ]; then
    echo "Backend build failed!"; exit 1
fi

# 2. Build Frontend
echo "Building Frontend..."
cd "$FRONTEND_DIR"
npm install
npm run build
if [ $? -ne 0 ]; then
    echo "Frontend build failed!"; exit 1
fi

# 3. Manage Processes with PM2
echo "Restarting services with PM2..."

# Stop existing processes if any (ignoring errors if they don't exist)
pm2 delete all 2>/dev/null || true

# Start Backend
# Use "exec" interpreter to run binary directly, --cwd to set working directory
pm2 start "$BACKEND_DIR/bmlquery-backend" \
    --name "bmlquery-backend" \
    --cwd "$BACKEND_DIR" \
    --output "$LOG_FILE" \
    --error "$LOG_FILE" \
    --merge-logs

# Start Frontend
# Start Next.js in production mode
# Use "npm" as interpreter
pm2 start npm \
    --name "bmlquery-frontend" \
    --cwd "$FRONTEND_DIR" \
    --output "$LOG_FILE" \
    --error "$LOG_FILE" \
    --merge-logs \
    -- start -- -p 8086

# Save PM2 list
pm2 save

echo "Deployment complete!"
echo "Backend and Frontend are running."
echo "Check status with: pm2 status"
echo "View logs with: tail -f $LOG_FILE"

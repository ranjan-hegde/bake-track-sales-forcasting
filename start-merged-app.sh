#!/bin/bash
#
# start-merged-app.sh
# Starts all three services for the merged Shop + ML Forecasting app.
# Press Ctrl+C to shut down all servers cleanly.
#

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# PIDs of child processes
ML_PID=""
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
    echo ""
    echo -e "${YELLOW}🛑 Shutting down all servers...${NC}"

    if [ -n "$FRONTEND_PID" ] && kill -0 "$FRONTEND_PID" 2>/dev/null; then
        kill "$FRONTEND_PID" 2>/dev/null
        echo -e "${BLUE}   ✓ Frontend stopped${NC}"
    fi

    if [ -n "$BACKEND_PID" ] && kill -0 "$BACKEND_PID" 2>/dev/null; then
        kill "$BACKEND_PID" 2>/dev/null
        echo -e "${CYAN}   ✓ Backend stopped${NC}"
    fi

    if [ -n "$ML_PID" ] && kill -0 "$ML_PID" 2>/dev/null; then
        kill "$ML_PID" 2>/dev/null
        echo -e "${GREEN}   ✓ ML API stopped${NC}"
    fi

    # Wait briefly for processes to terminate
    sleep 1

    # Force kill any remaining
    for PID in $ML_PID $BACKEND_PID $FRONTEND_PID; do
        if [ -n "$PID" ] && kill -0 "$PID" 2>/dev/null; then
            kill -9 "$PID" 2>/dev/null
        fi
    done

    echo -e "${GREEN}✅ All servers stopped. Goodbye!${NC}"
    exit 0
}

trap cleanup SIGINT SIGTERM EXIT

echo -e "${GREEN}"
echo "╔═══════════════════════════════════════════════════════╗"
echo "║     🚀 BAKE TRACK - Merged App Launcher              ║"
echo "║     Shop Management + ML Sales Forecasting            ║"
echo "╚═══════════════════════════════════════════════════════╝"
echo -e "${NC}"

# ── 1. Start Python ML API (port 8000) ────────────────────────────────
ML_DIR="$SCRIPT_DIR/store-sales-forecasting"
if [ ! -d "$ML_DIR" ]; then
    echo -e "${RED}❌ ML directory not found: $ML_DIR${NC}"
    exit 1
fi

# Find the virtual environment
VENV_UVICORN=""
if [ -f "$ML_DIR/ml_venv/bin/uvicorn" ]; then
    VENV_UVICORN="$ML_DIR/ml_venv/bin/uvicorn"
elif [ -f "$ML_DIR/.venv/bin/uvicorn" ]; then
    VENV_UVICORN="$ML_DIR/.venv/bin/uvicorn"
else
    echo -e "${RED}❌ No virtual environment with uvicorn found in $ML_DIR${NC}"
    echo -e "${YELLOW}   Run: cd $ML_DIR && python -m venv ml_venv && ml_venv/bin/pip install -r requirements-dual.txt${NC}"
    exit 1
fi

echo -e "${GREEN}🤖 Starting ML Forecasting API (port 8000)...${NC}"
cd "$ML_DIR"
"$VENV_UVICORN" dual_app:app --host 0.0.0.0 --port 8000 &
ML_PID=$!
echo -e "${GREEN}   PID: $ML_PID${NC}"

# ── 2. Start Node.js Backend (port 5000) ──────────────────────────────
BACKEND_DIR="$SCRIPT_DIR/no mercy/shop-backend"
if [ ! -d "$BACKEND_DIR" ]; then
    echo -e "${RED}❌ Backend directory not found: $BACKEND_DIR${NC}"
    exit 1
fi

echo -e "${CYAN}🖥️  Starting Node.js Backend (port 5000)...${NC}"
cd "$BACKEND_DIR"
node server.js &
BACKEND_PID=$!
echo -e "${CYAN}   PID: $BACKEND_PID${NC}"

# ── 3. Start React Frontend (port 5173) ──────────────────────────────
FRONTEND_DIR="$SCRIPT_DIR/no mercy/shop-frontend"
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Frontend directory not found: $FRONTEND_DIR${NC}"
    exit 1
fi

echo -e "${BLUE}🌐 Starting React Frontend (port 5173)...${NC}"
cd "$FRONTEND_DIR"
npm run dev &
FRONTEND_PID=$!
echo -e "${BLUE}   PID: $FRONTEND_PID${NC}"

# ── Wait & Display Info ──────────────────────────────────────────────
sleep 3
echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} ✅ All servers are running!${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════${NC}"
echo ""
echo -e "  ${BLUE}🌐 Frontend:${NC}     http://localhost:5173"
echo -e "  ${CYAN}🖥️  Backend API:${NC}  http://localhost:5000"
echo -e "  ${GREEN}🤖 ML API:${NC}       http://localhost:8000"
echo -e "  ${GREEN}📖 ML Swagger:${NC}   http://localhost:8000/docs"
echo ""
echo -e "  ${YELLOW}Press Ctrl+C to stop all servers${NC}"
echo ""

# Wait for any child to exit
wait

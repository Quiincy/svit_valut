#!/bin/bash

# Світ Валют - Start Script
# This script starts both backend and frontend servers

echo "🚀 Starting Світ Валют..."
echo ""

# Check if we're in the right directory
if [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo "❌ Error: Please run this script from the project root directory"
    exit 1
fi

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping servers..."
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
    exit 0
}

trap cleanup SIGINT SIGTERM

# Start Backend
echo "📦 Starting Backend (FastAPI)..."
cd backend
if [ ! -d "venv" ]; then
    echo "   Creating virtual environment..."
    python3 -m venv venv
fi
source venv/bin/activate
echo "   Installing dependencies..."
pip install --upgrade pip -q 2>/dev/null
pip install -r requirements.txt -q 2>/dev/null || pip install -r requirements.txt
echo "   Starting uvicorn server..."
python -m uvicorn main:app --host 0.0.0.0 --reload --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend to start
sleep 3

# Start Frontend
echo "🎨 Starting Frontend (React + Vite)..."
cd frontend
if [ ! -d "node_modules" ]; then
    echo "   Installing dependencies..."
    npm install
fi
npm run dev -- --host &
FRONTEND_PID=$!
cd ..

# Get local IP address
get_local_ip() {
    if command -v ifconfig &> /dev/null; then
        ifconfig 2>/dev/null | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | head -1
    elif command -v ip &> /dev/null; then
        ip route get 1 2>/dev/null | awk '{print $7}' | head -1
    elif command -v hostname &> /dev/null; then
        hostname -I 2>/dev/null | awk '{print $1}'
    fi
}

LOCAL_IP=$(get_local_ip)

echo ""
echo "✅ Світ Валют is running!"
echo ""
echo "   🔹 Frontend: http://localhost:5173"
echo "   🔹 Backend:  http://localhost:8000"
echo "   🔹 API Docs: http://localhost:8000/docs"
echo ""
if [ -n "$LOCAL_IP" ]; then
    echo "   📱 Доступ з мережі (для телефону):"
    echo "   🔹 Frontend: http://$LOCAL_IP:5173"
    echo "   🔹 Backend:  http://$LOCAL_IP:8000"
    echo ""
fi
echo "   🔐 Тестові дані для входу:"
echo "   🔹 Адмін:    admin / admin123"
echo "   🔹 Оператор: operator1 / op1pass"
echo ""
echo "Press Ctrl+C to stop all servers"
echo ""

# Wait for processes
wait

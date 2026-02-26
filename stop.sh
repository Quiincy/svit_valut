#!/bin/bash

# ============================================
# Світ Валют — Stop Server
# ============================================
# Хостинг: mirvalut.com
# ============================================

PROJECT_DIR="/home/leadgin/mirvalut.com/src/svit_valut"
PID_DIR="$PROJECT_DIR/pids"

echo "🛑 Зупинка Світ Валют..."
echo ""

stop_service() {
    local name="$1"
    local pid_file="$PID_DIR/$name.pid"

    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file")
        if kill -0 "$pid" 2>/dev/null; then
            kill "$pid" 2>/dev/null
            # Wait for graceful shutdown
            for i in {1..10}; do
                if ! kill -0 "$pid" 2>/dev/null; then
                    break
                fi
                sleep 0.5
            done
            # Force kill if still running
            if kill -0 "$pid" 2>/dev/null; then
                kill -9 "$pid" 2>/dev/null
            fi
            echo "   ✅ $name зупинено (PID: $pid)"
        else
            echo "   ⚠️  $name процес не знайдено (PID: $pid)"
        fi
        rm -f "$pid_file"
    else
        echo "   ⚠️  $name PID файл не знайдено"
    fi
}

# Stop backend
echo "📦 Зупинка Backend..."
stop_service "backend"

# Also kill any stray uvicorn processes
pkill -f "uvicorn app.main:app" 2>/dev/null || true

echo ""
echo "✅ Backend зупинено."
echo "   Фронтенд — статичні файли, не потребує зупинки."
echo ""

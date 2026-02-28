#!/bin/bash

# ============================================
# Світ Валют — Start Server (Production)
# ============================================
# Хостинг: mirvalut.com (ukraine.com.ua)
# Вихідний код: /home/leadgin/mirvalut.com/src/svit_valut
# Субдомен mirvalut.com → симлінк на frontend/dist
# ============================================

set -e

PROJECT_DIR="/home/leadgin/mirvalut.com/src/svit_valut"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
DIST_DIR="$FRONTEND_DIR/dist"
SUBDOMAIN_DIR="/home/leadgin/mirvalut.com/www"
LOG_DIR="$PROJECT_DIR/logs"
PID_DIR="$PROJECT_DIR/pids"

# Create dirs
mkdir -p "$LOG_DIR" "$PID_DIR" "$DIST_DIR"

echo "🚀 Запуск Світ Валют..."
echo ""

# ---- Backend ----
echo "📦 Запуск Backend (FastAPI)..."

cd "$BACKEND_DIR"

if [ ! -d "venv" ]; then
    echo "   Створення віртуального оточення..."
    python3.12 -m venv venv
fi

source venv/bin/activate

echo "   Встановлення залежностей..."
pip install --upgrade pip -q 2>/dev/null
pip install -r requirements.txt -q 2>/dev/null

echo "   Запуск міграцій..."
python migrate_rates_url.py 2>/dev/null || true

nohup python -m uvicorn app.main:app \
    --host 127.0.0.1 \
    --port 8000 \
    --workers 2 \
    > "$LOG_DIR/backend.log" 2>&1 &

echo $! > "$PID_DIR/backend.pid"
echo "   ✅ Backend запущено (PID: $(cat "$PID_DIR/backend.pid"))"

cd "$PROJECT_DIR"

# ---- Frontend ----
echo "🎨 Збірка Frontend..."

cd "$FRONTEND_DIR"

if [ ! -d "node_modules" ]; then
    echo "   Встановлення залежностей..."
    npm install
fi

# Build into frontend/dist/
echo "   Збірка production bundle..."
npm run build

# Copy app.js into dist for Passenger
cp "$FRONTEND_DIR/app.js" "$DIST_DIR/app.js"

# Create package.json for hosting Node.js runner
cat > "$DIST_DIR/package.json" << 'EOF'
{
  "name": "svit-valut-frontend",
  "version": "1.0.0",
  "scripts": {
    "start": "node app.js"
  }
}
EOF

# Create symlink: mirvalut.com/www → frontend/dist
echo "   Налаштування симлінку та перезапуск Passenger..."
mkdir -p "$DIST_DIR/tmp"
touch "$DIST_DIR/tmp/restart.txt"

# Remove old test (symlink or directory)
if [ -L "$SUBDOMAIN_DIR" ]; then
    rm -f "$SUBDOMAIN_DIR"
elif [ -d "$SUBDOMAIN_DIR" ]; then
    rm -rf "$SUBDOMAIN_DIR"
fi

ln -s "$DIST_DIR" "$SUBDOMAIN_DIR"

echo "   ✅ Frontend зібрано (симлінк: mirvalut.com/www → frontend/dist)"

cd "$PROJECT_DIR"

# ---- Summary ----
echo ""
echo "═══════════════════════════════════════"
echo "  ✅ Світ Валют запущено!"
echo "═══════════════════════════════════════"
echo ""
echo "  🔹 Backend API:  http://127.0.0.1:8000"
echo "  🔹 Frontend:     $DIST_DIR"
echo "  🔹 Симлінк:      $SUBDOMAIN_DIR/www → $DIST_DIR"
echo ""
echo "  📁 Логи:         $LOG_DIR/"
echo "  📁 PID файли:    $PID_DIR/"
echo ""
echo "  🛑 Для зупинки:  ./stop.sh"
echo ""

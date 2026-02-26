#!/bin/bash

# ============================================
# Світ Валют — Restart Server
# ============================================

PROJECT_DIR="/home/leadgin/mirvalut.com/src/svit_valut"

echo "🔄 Перезапуск Світ Валют..."
echo ""

"$PROJECT_DIR/stop.sh"
sleep 2
"$PROJECT_DIR/start.sh"

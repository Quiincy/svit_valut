#!/bin/bash

# ============================================
# Світ Валют — Deploy to Server
# ============================================
# Запускати з Mac: ./deploy.sh
# ============================================

# ⚠️ НАЛАШТУЙТЕ ПІД ВАШ ХОСТИНГ:
SSH_HOST="leadgin@leadgin.ftp.tools"   # SSH хост
SSH_PORT="22"                      # SSH порт (часто 22, 2222, або інший)
REMOTE_DIR="/home/leadgin/mirvalut.com/src/svit_valut"
LOCAL_DIR="/Users/quincy/Desktop/svit_valut/"

SSH_CMD="ssh -p $SSH_PORT"

echo "🚀 Деплой Світ Валют на сервер..."
echo "   Сервер: $SSH_HOST (порт $SSH_PORT)"
echo "   Шлях:   $REMOTE_DIR"
echo ""

# Sync files (excluding dev artifacts)
rsync -avz --progress --delete \
  -e "ssh -p $SSH_PORT" \
  --exclude 'node_modules' \
  --exclude 'venv' \
  --exclude 'dist' \
  --exclude '.git' \
  --exclude '__pycache__' \
  --exclude 'logs' \
  --exclude 'pids' \
  --exclude '.DS_Store' \
  --exclude '*.db' \
  --exclude '.env' \
  --exclude 'backend/static/uploads/' \
  --exclude 'static/uploads/' \
  "$LOCAL_DIR" "$SSH_HOST:$REMOTE_DIR/"

if [ $? -ne 0 ]; then
    echo ""
    echo "❌ Помилка завантаження! Перевірте SSH підключення:"
    echo "   ssh -p $SSH_PORT $SSH_HOST"
    exit 1
fi

echo ""
echo "✅ Файли завантажено!"
echo ""

# Ask to restart
read -p "🔄 Перезапустити сервер? (y/n): " RESTART
if [ "$RESTART" = "y" ] || [ "$RESTART" = "Y" ]; then
    echo "   Перезапуск..."
    $SSH_CMD "$SSH_HOST" "cd $REMOTE_DIR && chmod +x start.sh stop.sh restart.sh && chmod -R +x frontend/node_modules/.bin/ && chmod +x frontend/node_modules/@esbuild/linux-x64/bin/esbuild && ./restart.sh"
    echo "✅ Сервер перезапущено!"
else
    echo "ℹ️  Для перезапуску: $SSH_CMD $SSH_HOST 'cd $REMOTE_DIR && ./restart.sh'"
fi

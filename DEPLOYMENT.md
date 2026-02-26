# Деплой Світ Валют

## Шляхи на сервері

| Що | Шлях |
|---|---|
| Вихідний код | `/home/leadgin/mirvalut.com/src/svit_valut` |
| Document root (піддомен) | `/home/leadgin/mirvalut.com/test` |
| Логи | `.../src/svit_valut/logs/` |
| БД | `.../src/svit_valut/backend/svit_valut.db` |

---

## Перший деплой

### 1. Перевірити залежності (SSH)

```bash
ssh leadgin@mirvalut.com

# Вже встановлено на хостингу:
python3.12 --version    # Python 3.12.12
node --version          # v24.13.0
```

> Хостинг: CloudLinux (ukraine.com.ua). Python 3.12 та Node.js вже доступні. Root доступ не потрібен.

### 2. Завантажити файли (з Mac)

```bash
cd /Users/quincy/Desktop/svit_valut
./deploy.sh
```

> Скрипт `deploy.sh` використовує `rsync` — завантажує тільки потрібні файли, без `node_modules`, `venv`, `.git`, баз даних.

### 3. Налаштувати .env (SSH)

```bash
ssh leadgin@mirvalut.com
cd /home/leadgin/mirvalut.com/src/svit_valut
cp .env.example .env
nano .env
```

```
DATABASE_URL=sqlite:///./svit_valut.db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ваш_пароль
FRONTEND_URL=https://test.mirvalut.com
TZ=Europe/Kyiv
```

### 4. Запустити (SSH)

```bash
cd /home/leadgin/mirvalut.com/src/svit_valut
chmod +x start.sh stop.sh restart.sh deploy.sh
./start.sh
```

---

## Оновлення коду

З Mac — одна команда:
```bash
./deploy.sh
```

Скрипт запитає чи перезапустити сервер після завантаження.

---

## Управління сервером (SSH)

```bash
cd /home/leadgin/mirvalut.com/src/svit_valut

./start.sh       # Запуск (бекенд + збірка фронту)
./stop.sh        # Зупинка бекенду
./restart.sh     # Перезапуск
```

## Корисні команди (SSH)

```bash
# Логи
tail -f /home/leadgin/mirvalut.com/src/svit_valut/logs/backend.log

# Перевірка API
curl http://127.0.0.1:8000/api/health

# Бекап БД
cp .../backend/svit_valut.db .../backend/backup_$(date +%F).db
```

---

## Як це працює

```
Mac (розробка)                    Сервер (продакшн)
─────────────                     ─────────────────
./deploy.sh  ──── rsync ────►  /home/leadgin/mirvalut.com/src/svit_valut/
                                    │
                               ./start.sh
                                    │
                          ┌─────────┴──────────┐
                          │                    │
                    Backend (8000)       npm run build
                    uvicorn, 2 workers         │
                          │                    ▼
                          │         /home/leadgin/mirvalut.com/src/svit_valut/frontend/dist/
                          │         (сюди копіюється app.js)
                          │                    ▲
                          │                    │ Симлінк
                          │                    │
                          └────── Passenger ───┘
                                   Node.js
                          (test.mirvalut.com/www)
```

## Структура

```
/home/leadgin/mirvalut.com/src/svit_valut/   # Вихідний код
├── backend/
│   ├── app/
│   ├── svit_valut.db
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── dist/            # Зібраний bundle + app.js
│   └── app.js
├── logs/
├── pids/
├── start.sh
├── stop.sh
├── restart.sh
├── deploy.sh
└── .env

/home/leadgin/test.mirvalut.com/
├── .htaccess            # Дозволяє слідувати за симлінками
└── www/                 # Симлінк -> ../mirvalut.com/src/svit_valut/frontend/dist/
```

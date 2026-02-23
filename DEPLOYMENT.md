# Деплой Світ Валют на VPS (ukraine.com.ua)

> ⚠️ На ukraine.com.ua потрібен **VPS**, не shared-хостинг.
> Shared-хостинг підтримує тільки PHP, а проект використовує Python (FastAPI).
> VPS плани: https://www.ukraine.com.ua/vps/

## Крок 1: Замовити VPS

- **Мінімальні вимоги:** 1 CPU, 1 GB RAM, 20 GB SSD
- **ОС:** Ubuntu 22.04 або 24.04
- Після створення отримаєте **IP адресу** та **root пароль**

## Крок 2: Підключитися до VPS

```bash
ssh root@YOUR_SERVER_IP
```

## Крок 3: Встановити Docker

```bash
# Оновити систему
apt update && apt upgrade -y

# Встановити Docker
curl -fsSL https://get.docker.com | sh

# Встановити Docker Compose
apt install -y docker-compose-plugin

# Перевірити
docker --version
docker compose version
```

## Крок 4: Завантажити проект

**Варіант A — через Git:**
```bash
apt install -y git
cd /var/www
git clone https://github.com/YOUR_USERNAME/svit_valut.git
cd svit_valut
```

**Варіант B — через SCP (з вашого Mac):**
```bash
# На вашому Mac:
scp -r /Users/quincy/Desktop/svit_valut root@YOUR_SERVER_IP:/var/www/svit_valut
```

## Крок 5: Налаштувати змінні

```bash
cd /var/www/svit_valut
cp .env.example .env
nano .env
```

Заповнити:
```
DATABASE_URL=sqlite:///./svit_valut.db
ADMIN_USERNAME=admin
ADMIN_PASSWORD=ваш_надійний_пароль
FRONTEND_URL=https://ваш-домен.com
TZ=Europe/Kyiv
```

## Крок 6: Запустити

```bash
docker compose up -d --build
```

Перевірити:
```bash
# Статус контейнерів
docker compose ps

# Логи
docker compose logs -f

# Тест API
curl http://localhost:8000/api/health
```

## Крок 7: Налаштувати домен

1. В DNS панелі ukraine.com.ua створити **A-запис**:
   - `@` → `YOUR_SERVER_IP`
   - `www` → `YOUR_SERVER_IP`

2. Почекати 5-15 хвилин на поширення DNS.

## Крок 8: SSL сертифікат (HTTPS)

```bash
# Встановити Certbot
apt install -y certbot

# Зупинити frontend контейнер тимчасово
docker compose stop frontend

# Отримати сертифікат
certbot certonly --standalone -d ваш-домен.com -d www.ваш-домен.com

# Запустити назад
docker compose up -d
```

Після отримання SSL, оновити `frontend/nginx.conf` для HTTPS і перебілдити.

---

## Корисні команди

```bash
# Перезапустити
docker compose restart

# Оновити код і перебілдити
cd /var/www/svit_valut
git pull
docker compose up -d --build

# Подивитися логи бекенду
docker compose logs backend -f --tail=50

# Бекап бази даних
docker compose exec backend cp /app/svit_valut.db /app/data/backup_$(date +%F).db
```

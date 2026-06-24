# DEPLOY.md

Практический runbook для выкладки Orchid Control на чистый Ubuntu Server.

Актуальная цель на 18 июня 2026: Ubuntu 26.04 LTS. Скрипт ниже проверяет именно эту версию и останавливается на другой Ubuntu, если явно не передать `ORCHID_ALLOW_UNSUPPORTED_UBUNTU=1`.

## Что получится после деплоя

- PostgreSQL работает локально на сервере.
- API запущен через PM2 на `127.0.0.1:3005`.
- Web собран как Vite static build и отдается через nginx.
- nginx проксирует `/api/*` и `/health` в API.
- Данные приложения хранятся в PostgreSQL, не в Google Sheets, Excel, CSV или файловых выгрузках.
- Production seed создает только базовые настройки, справочники и утвержденных пользователей:
  - `sasha@orchid.local` - Саша, owner;
  - `roma@orchid.local` - Рома, admin;
  - `yura@orchid.local` - Юра, admin;
  - `lenya@orchid.local` - Леня, admin;
  - `vanya@orchid.local` - Ваня, manager;
  - `dima@orchid.local` - Дима, master.

Demo-заказы не создаются. Не запускайте `db:seed:demo` на production.

## Быстрый деплой скриптом

На сервере должен быть домен, который уже указывает A-записью на IP сервера. Пример ниже ставит приложение в `/opt/orchid-control`.

### Вариант A: репозиторий уже загружен на сервер

```bash
cd /path/to/orchid-local-saas-obsidian

sudo ORCHID_DOMAIN=orchid.example.com \
  ORCHID_SEED_PASSWORD='replace-with-strong-initial-password' \
  bash scripts/deploy-ubuntu-lts.sh
```

Что делает команда:

- ставит системные пакеты: `nginx`, `postgresql`, `git`, `curl`, `rsync`, `ufw`;
- ставит Node.js и PM2;
- копирует текущий checkout в `/opt/orchid-control`;
- создает локальную БД PostgreSQL;
- пишет production env в `/etc/orchid-control/orchid.env`;
- выполняет `pnpm install`, `db:generate`, `typecheck`, `test`, `build`;
- применяет Prisma migrations через `migrate deploy`;
- запускает production seed;
- запускает API через PM2;
- настраивает nginx и firewall.

### Вариант B: сервер сам забирает код из Git

```bash
sudo ORCHID_DOMAIN=orchid.example.com \
  ORCHID_REPO_URL='git@github.com:OWNER/REPO.git' \
  ORCHID_REPO_REF='main' \
  ORCHID_SEED_PASSWORD='replace-with-strong-initial-password' \
  bash scripts/deploy-ubuntu-lts.sh
```

Что меняется:

- если `/opt/orchid-control` уже Git checkout, скрипт делает `fetch`, `checkout`, `reset --hard origin/<ref>`;
- если checkout еще нет, скрипт делает `git clone`.

## HTTPS через Let's Encrypt

Если DNS уже смотрит на сервер, можно сразу включить сертификат:

```bash
sudo ORCHID_DOMAIN=orchid.example.com \
  ORCHID_ENABLE_LETSENCRYPT=1 \
  ORCHID_CERTBOT_EMAIL=owner@example.com \
  ORCHID_SEED_PASSWORD='replace-with-strong-initial-password' \
  bash scripts/deploy-ubuntu-lts.sh
```

Что делает дополнительно:

- ставит `certbot` и `python3-certbot-nginx`;
- выпускает сертификат для домена;
- включает redirect с HTTP на HTTPS.

Если DNS еще не готов, сначала деплойте без `ORCHID_ENABLE_LETSENCRYPT=1`, проверьте `http://domain/health`, потом повторите команду с Let's Encrypt.

## Переменные скрипта

Обязательная:

```bash
ORCHID_DOMAIN=orchid.example.com
```

Часто используемые:

```bash
ORCHID_APP_DIR=/opt/orchid-control
ORCHID_REPO_URL='git@github.com:OWNER/REPO.git'
ORCHID_REPO_REF=main
ORCHID_SEED_PASSWORD='initial-password-for-production-users'
ORCHID_ENABLE_LETSENCRYPT=1
ORCHID_CERTBOT_EMAIL=owner@example.com
```

Редко используемые:

```bash
ORCHID_DB_NAME=orchid_control
ORCHID_DB_USER=orchid
ORCHID_DB_PASSWORD='generated-if-empty'
JWT_ACCESS_SECRET='generated-if-empty'
JWT_REFRESH_SECRET='generated-if-empty'
NODE_MAJOR=22
ORCHID_SKIP_VERIFY=1
ORCHID_ALLOW_UNSUPPORTED_UBUNTU=1
```

`ORCHID_SKIP_VERIFY=1` пропускает `typecheck` и тесты. Для первого production deploy лучше не использовать.

Если передаете пароли и JWT-секреты вручную, используйте только URL/shell-safe символы: латиницу, цифры, `.`, `_`, `~`, `-`. Если оставить секреты пустыми, скрипт сгенерирует безопасные значения сам.

Если `ORCHID_SEED_PASSWORD` не задан, скрипт генерирует пароль сам и сохраняет его в:

```bash
sudo cat /etc/orchid-control/initial-admin-password.txt
```

Этот пароль применяется ко всем production-пользователям из seed. После первого запуска его нужно заменить операционно.

## Production env

Скрипт пишет файл:

```bash
/etc/orchid-control/orchid.env
```

Содержимое по смыслу:

```env
NODE_ENV=production
DATABASE_URL=postgresql://orchid:<password>@127.0.0.1:5432/orchid_control?schema=public
JWT_ACCESS_SECRET=<random>
JWT_REFRESH_SECRET=<random>
APP_URL=https://orchid.example.com
API_URL=https://orchid.example.com/api
VITE_API_URL=
ORCHID_SEED_PASSWORD=<initial-password>
PORT=3005
HOST=127.0.0.1
```

`VITE_API_URL` пустой, потому что frontend и API живут на одном домене, а API доступен по `/api`.

## Ручной деплой по шагам

Если скрипт не подходит, команды ниже повторяют его вручную.

### 1. Системные пакеты

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl git gnupg nginx openssl postgresql postgresql-contrib rsync sudo ufw
```

Описание:

- `postgresql` хранит все production-данные;
- `nginx` отдает frontend и проксирует API;
- `rsync` нужен для копирования checkout в `/opt/orchid-control`;
- `ufw` открывает только SSH и web-порты.

### 2. Node.js, pnpm и PM2

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo bash -
sudo apt-get install -y nodejs
sudo corepack enable
sudo corepack prepare pnpm@9.15.4 --activate
sudo npm install -g pm2@5.4.3
```

Описание:

- проект собирается и запускается на Node.js;
- версия pnpm берется из `packageManager` в `package.json`;
- PM2 держит API-процесс живым и поднимает его после перезагрузки.

### 3. Пользователь приложения

```bash
sudo useradd --system --create-home --home-dir /var/lib/orchid --shell /bin/bash orchid
sudo install -d -m 0755 /opt/orchid-control
sudo chown -R orchid:orchid /opt/orchid-control
```

Описание:

- приложение не должно работать под root;
- `/opt/orchid-control` - директория с кодом и собранными артефактами.

### 4. PostgreSQL

```bash
sudo systemctl enable --now postgresql
sudo -u postgres psql -c "CREATE USER orchid WITH PASSWORD 'replace-with-db-password';"
sudo -u postgres createdb -O orchid orchid_control
```

Если пользователь уже есть:

```bash
sudo -u postgres psql -c "ALTER USER orchid WITH PASSWORD 'replace-with-db-password';"
```

Описание:

- отдельный пользователь БД снижает blast radius;
- приложение ходит в PostgreSQL через `DATABASE_URL`.

### 5. Env

```bash
sudo install -d -m 0750 -o root -g orchid /etc/orchid-control
sudo nano /etc/orchid-control/orchid.env
sudo chown root:orchid /etc/orchid-control/orchid.env
sudo chmod 0640 /etc/orchid-control/orchid.env
```

Минимальный env:

```env
NODE_ENV=production
DATABASE_URL=postgresql://orchid:replace-with-db-password@127.0.0.1:5432/orchid_control?schema=public
JWT_ACCESS_SECRET=replace-with-at-least-32-random-characters
JWT_REFRESH_SECRET=replace-with-at-least-32-random-characters
APP_URL=https://orchid.example.com
API_URL=https://orchid.example.com/api
VITE_API_URL=
ORCHID_SEED_PASSWORD=replace-with-initial-password
PORT=3005
HOST=127.0.0.1
```

### 6. Установка, проверка и сборка

```bash
sudo -u orchid -H bash -lc "cd /opt/orchid-control && corepack pnpm --version"
sudo -u orchid -H bash -lc "cd /opt/orchid-control && corepack pnpm install --frozen-lockfile --prod=false"
sudo -u orchid -H bash -lc "cd /opt/orchid-control && set -a && source /etc/orchid-control/orchid.env && set +a && corepack pnpm db:generate"
sudo -u orchid -H bash -lc "cd /opt/orchid-control && set -a && source /etc/orchid-control/orchid.env && set +a && corepack pnpm --filter @orchid/shared build"
sudo -u orchid -H bash -lc "cd /opt/orchid-control && set -a && source /etc/orchid-control/orchid.env && set +a && corepack pnpm --filter @orchid/db build"
sudo -u orchid -H bash -lc "cd /opt/orchid-control && set -a && source /etc/orchid-control/orchid.env && set +a && corepack pnpm -r typecheck"
sudo -u orchid -H bash -lc "cd /opt/orchid-control && set -a && source /etc/orchid-control/orchid.env && set +a && corepack pnpm -r test"
sudo -u orchid -H bash -lc "cd /opt/orchid-control && set -a && source /etc/orchid-control/orchid.env && set +a && corepack pnpm -r build"
```

Описание:

- `install --frozen-lockfile` ставит зависимости строго по `pnpm-lock.yaml`;
- `db:generate` генерирует Prisma Client;
- `typecheck` ловит ошибки контрактов до запуска;
- `test` прогоняет API/web проверки;
- `build` собирает API, web и пакеты workspace.

### 7. Миграции и seed

```bash
sudo -u orchid -H bash -lc "cd /opt/orchid-control && set -a && source /etc/orchid-control/orchid.env && set +a && corepack pnpm --filter @orchid/db prisma migrate deploy"
sudo -u orchid -H bash -lc "cd /opt/orchid-control && set -a && source /etc/orchid-control/orchid.env && set +a && corepack pnpm db:seed"
```

Описание:

- `migrate deploy` применяет уже созданные migrations, без dev-генерации;
- `db:seed` создает production users, базовые настройки и справочники;
- `db:seed:demo` на production не запускать.

### 8. PM2

```bash
sudo -u orchid -H bash -lc "cd /opt/orchid-control && set -a && source /etc/orchid-control/orchid.env && set +a && pm2 startOrReload ecosystem.config.cjs --only orchid-api --update-env"
sudo -u orchid -H pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u orchid --hp /var/lib/orchid
```

Описание:

- запускаем только `orchid-api`;
- web не запускается через PM2, потому что nginx отдает `apps/web/dist`;
- `pm2 save` сохраняет список процессов;
- `pm2 startup` включает автозапуск после reboot.

### 9. nginx

```bash
sudo nano /etc/nginx/sites-available/orchid-control
```

Конфиг:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name orchid.example.com;

    root /opt/orchid-control/apps/web/dist;
    index index.html;

    client_max_body_size 10m;

    location /health {
        proxy_pass http://127.0.0.1:3005/health;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3005/api/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

Включить сайт:

```bash
sudo ln -sfn /etc/nginx/sites-available/orchid-control /etc/nginx/sites-enabled/orchid-control
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl enable --now nginx
sudo systemctl reload nginx
```

Описание:

- `/api/*` уходит в Fastify API;
- `/health` нужен для простой проверки живости;
- все остальные пути обслуживаются как SPA через `index.html`.

### 10. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

Описание:

- SSH остается доступным;
- наружу открыты только HTTP/HTTPS;
- API-порт `3005` не открывается наружу.

### 11. HTTPS

```bash
sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx --redirect -d orchid.example.com --email owner@example.com --agree-tos --non-interactive
```

Описание:

- certbot сам обновляет nginx-конфиг;
- renewal устанавливается автоматически через systemd timer.

## Проверка после деплоя

```bash
curl -fsS https://orchid.example.com/health
curl -I https://orchid.example.com/
sudo -u orchid -H pm2 status
sudo -u orchid -H pm2 logs orchid-api --lines 100
sudo tail -n 100 /var/log/nginx/error.log
```

Ожидаемо:

- `/health` отвечает успешно;
- главная страница возвращает HTML;
- `orchid-api` в PM2 имеет статус `online`;
- в nginx error log нет свежих ошибок.

## Backup

Минимальный ручной backup:

```bash
sudo install -d -m 0750 /backups/orchid-control
set -a
source /etc/orchid-control/orchid.env
set +a
pg_dump "$DATABASE_URL" | gzip | sudo tee "/backups/orchid-control/orchid-control-$(date +%F-%H%M).sql.gz" >/dev/null
```

Cron пример:

```bash
sudo crontab -e
```

```cron
15 3 * * * bash -lc 'set -a; source /etc/orchid-control/orchid.env; set +a; pg_dump "$DATABASE_URL" | gzip > /backups/orchid-control/orchid-control-$(date +\%F-\%H\%M).sql.gz'
```

Restore в пустую БД:

```bash
gunzip -c /backups/orchid-control/orchid-control-YYYY-MM-DD-HHMM.sql.gz | psql "$DATABASE_URL"
```

Перед первым боевым днем стоит сделать test restore на отдельную БД.

## Обновление новой версии

```bash
cd /path/to/orchid-local-saas-obsidian
sudo ORCHID_DOMAIN=orchid.example.com bash scripts/deploy-ubuntu-lts.sh
```

Если сервер тянет код сам:

```bash
sudo ORCHID_DOMAIN=orchid.example.com \
  ORCHID_REPO_URL='git@github.com:OWNER/REPO.git' \
  ORCHID_REPO_REF='main' \
  bash scripts/deploy-ubuntu-lts.sh
```

Что важно:

- скрипт заново ставит зависимости по lockfile;
- заново собирает web/API;
- применяет только непримененные Prisma migrations;
- перезапускает PM2 с актуальным env;
- сохраняет уже созданные секреты из `/etc/orchid-control/orchid.env`, если новые не переданы явно;
- nginx-конфиг переписывается идемпотентно и сохраняет HTTPS, если сертификат уже выпущен.

## Быстрый rollback

Если код приходит из Git:

```bash
cd /opt/orchid-control
sudo -u orchid -H git log --oneline -5
sudo -u orchid -H git checkout <previous-good-sha>
sudo -u orchid -H bash -lc "cd /opt/orchid-control && set -a && source /etc/orchid-control/orchid.env && set +a && corepack pnpm install --frozen-lockfile --prod=false && corepack pnpm -r build"
sudo -u orchid -H bash -lc "cd /opt/orchid-control && set -a && source /etc/orchid-control/orchid.env && set +a && pm2 restart orchid-api --update-env"
sudo systemctl reload nginx
```

Если проблема в данных, сначала остановиться и восстановиться из backup на отдельной БД, не затирая production без проверки.

## Что не делать на production

- Не запускать `corepack pnpm db:seed:demo`.
- Не открывать порт `3005` наружу.
- Не хранить backup только на этом же сервере.
- Не коммитить `/etc/orchid-control/orchid.env`.
- Не использовать Google Drive, Google Sheets, Excel или CSV как runtime-хранилище данных приложения.

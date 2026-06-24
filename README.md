# Orchid Control

Local-first B2B SaaS для управления ремонтной мастерской. Данные приложения хранятся в PostgreSQL и доступны через Prisma. Google Sheets, Google Forms, Apps Script, Google Drive, Excel и CSV не являются хранилищами данных приложения.

## Что Запускается

- API: Fastify + TypeScript, порт `3005`.
- Web: React + Vite + TypeScript, порт `5173`.
- Database: PostgreSQL, локальный порт `5433`.
- Process manager: PM2 для production-like запуска.
- Package manager: `pnpm@9.15.4` через Corepack.

## Production На Ubuntu Из Root

Этот раздел рассчитан на чистый Ubuntu Server, где изначально есть только пользователь `root`.

Важно: приложение не должно постоянно работать от `root`. Деплой-скрипт запускается от `root`, сам ставит системные пакеты, создает отдельного пользователя `orchid`, копирует приложение в `/opt/orchid-control`, пишет секреты в `/etc/orchid-control/orchid.env`, запускает API через PM2 от пользователя `orchid` и настраивает nginx.

Для нормального входа в приложение нужен домен с HTTPS. Без HTTPS production cookies будут помечены как `secure`, поэтому по чистому `http://IP` можно проверить `/health`, но логин в браузере может не работать корректно.

### 1. Зайти на сервер

На своем компьютере:

```bash
ssh root@SERVER_IP
```

### 2. Проверить Ubuntu

На сервере:

```bash
cat /etc/os-release
```

Скрипт по умолчанию ожидает Ubuntu `26.04`. Если у тебя другая LTS-версия и ты осознанно продолжаешь, перед запуском деплоя добавь:

```bash
export ORCHID_ALLOW_UNSUPPORTED_UBUNTU=1
```

### 3. Поставить минимальные пакеты для скачивания проекта

```bash
apt-get update
DEBIAN_FRONTEND=noninteractive apt-get install -y ca-certificates curl git
```

### 4. Указать домен и репозиторий

Замени `orchid.example.com` и `owner@example.com` на свои значения. DNS A-запись домена должна уже смотреть на IP сервера.

```bash
export ORCHID_DOMAIN=orchid.example.com
export ORCHID_CERTBOT_EMAIL=owner@example.com
export ORCHID_ENABLE_LETSENCRYPT=1
export ORCHID_REPO_URL=https://github.com/junktownband/orchid-orders-vibe-app.git
export ORCHID_REPO_REF=main
```

Если домен еще не готов, не включай Let's Encrypt на первом прогоне:

```bash
export ORCHID_ENABLE_LETSENCRYPT=0
```

После настройки DNS повтори деплой с `ORCHID_ENABLE_LETSENCRYPT=1`.

### 5. Скачать проект

```bash
git clone --branch "$ORCHID_REPO_REF" "$ORCHID_REPO_URL" /root/orchid-orders-vibe-app
cd /root/orchid-orders-vibe-app
```

Если папка уже существует после прошлой попытки:

```bash
cd /root/orchid-orders-vibe-app
git fetch origin "$ORCHID_REPO_REF"
git checkout "$ORCHID_REPO_REF"
git reset --hard "origin/$ORCHID_REPO_REF"
```

### 6. Запустить деплой

Запускай именно от `root`, без `sudo`.

```bash
bash scripts/deploy-ubuntu-lts.sh
```

Скрипт по шагам сделает:

- установку `nginx`, `postgresql`, `sudo`, `ufw`, Node.js 22, Corepack и PM2;
- создание пользователя `orchid`;
- копирование проекта в `/opt/orchid-control`;
- создание PostgreSQL базы и пользователя;
- генерацию `DATABASE_URL`, JWT-секретов и initial seed password;
- `pnpm install`, `db:generate`, `typecheck`, `test`, `build`;
- `prisma migrate deploy` и production seed;
- запуск API через PM2;
- настройку nginx, firewall и Let's Encrypt, если он включен.

### 7. Проверить сервисы

```bash
systemctl status nginx --no-pager
systemctl status postgresql --no-pager
sudo -u orchid -H "$(command -v pm2)" status
```

Проверить health endpoint:

```bash
curl -fsS "https://${ORCHID_DOMAIN}/health"
```

Если Let's Encrypt еще не включен:

```bash
curl -fsS "http://${ORCHID_DOMAIN}/health"
```

### 8. Получить пароль первого входа

```bash
cat /etc/orchid-control/initial-admin-password.txt
```

Первый пользователь:

- email: `sasha@orchid.local`
- password: значение из `/etc/orchid-control/initial-admin-password.txt`

После первого входа сохрани пароль в менеджере паролей. Файл с паролем на сервере доступен только `root` и группе приложения, но его все равно лучше считать временным секретом.

### 9. Логи и перезапуск

```bash
sudo -u orchid -H "$(command -v pm2)" logs orchid-api
```

```bash
sudo -u orchid -H "$(command -v pm2)" restart orchid-api --update-env
```

```bash
nginx -t
systemctl reload nginx
```

### 10. Повторный деплой после новых коммитов

```bash
ssh root@SERVER_IP
cd /root/orchid-orders-vibe-app
git fetch origin main
git checkout main
git reset --hard origin/main
export ORCHID_DOMAIN=orchid.example.com
export ORCHID_CERTBOT_EMAIL=owner@example.com
export ORCHID_ENABLE_LETSENCRYPT=1
export ORCHID_REPO_URL=https://github.com/junktownband/orchid-orders-vibe-app.git
export ORCHID_REPO_REF=main
bash scripts/deploy-ubuntu-lts.sh
```

Не запускай `corepack pnpm dev`, `db:seed:demo` или ручной PM2 от `root` на production-сервере.

## Правила Безопасного Запуска

1. Не коммитьте `.env`: файл уже добавлен в `.gitignore`.
2. Не используйте значения из `.env.example` как настоящие секреты.
3. Для обычного seed всегда задавайте `ORCHID_SEED_PASSWORD`.
4. `db:seed:demo` используйте только локально: он создает демо-заказы и может использовать пароль `orchid12345`.
5. В production API должен слушать `127.0.0.1` за nginx/reverse proxy, а наружу должны быть открыты только HTTP/HTTPS.
6. После первого входа сохраните seed-пароль в менеджере паролей и удалите локальный файл `.orchid-initial-password.txt`.

## Локальные Требования Для Windows

Этот раздел нужен только для локального запуска на Windows-машине разработчика, не для Ubuntu-сервера.

Установите заранее:

- Git
- Node.js 22 LTS или новее
- Docker Desktop
- PowerShell

Проверьте, что инструменты доступны:

```powershell
git --version
node --version
docker --version
```

## Локальный Запуск На Windows

Команды ниже рассчитаны на Windows PowerShell. Выполняйте их из корня проекта одну за другой.

### 1. Перейти в проект

```powershell
cd C:\projects\orchid-local-saas-obsidian
```

### 2. Включить Corepack и подготовить pnpm

```powershell
corepack enable
corepack prepare pnpm@9.15.4 --activate
corepack pnpm --version
```

### 3. Установить зависимости

```powershell
corepack pnpm install
```

### 4. Запустить PostgreSQL в Docker

Эта команда безопасно создаст контейнер, если его еще нет, или запустит уже созданный.

```powershell
$postgresName = "orchid-control-postgres-5433"
$postgresExists = docker ps -a --format "{{.Names}}" | Where-Object { $_ -eq $postgresName }
$postgresRunning = docker ps --format "{{.Names}}" | Where-Object { $_ -eq $postgresName }
if (-not $postgresExists) { docker run --name $postgresName -e POSTGRES_USER=orchid -e POSTGRES_PASSWORD=orchid -e POSTGRES_DB=orchid_control -p 5433:5432 -v orchid_postgres_5433_data:/var/lib/postgresql/data -d postgres:16 } elseif (-not $postgresRunning) { docker start $postgresName } else { Write-Host "$postgresName already running" }
```

Проверить, что контейнер работает:

```powershell
docker ps --filter "name=orchid-control-postgres-5433"
```

### 5. Создать безопасный `.env`

Команда ниже не перезаписывает существующий `.env`. Если файл уже есть, она остановится, чтобы случайно не стереть секреты.

```powershell
if (Test-Path .env) { throw ".env already exists. Review it manually instead of overwriting secrets." }
$jwtAccess = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
$jwtRefresh = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32)).ToLowerInvariant()
$seedPassword = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(18)).ToLowerInvariant()
@"
DATABASE_URL="postgresql://orchid:orchid@localhost:5433/orchid_control?schema=public"
JWT_ACCESS_SECRET="$jwtAccess"
JWT_REFRESH_SECRET="$jwtRefresh"
APP_URL="http://localhost:5173"
API_URL="http://localhost:3005"
VITE_API_URL=""
ORCHID_SEED_PASSWORD="$seedPassword"
NODE_ENV="development"
PORT="3005"
HOST="127.0.0.1"
"@ | Set-Content .env -Encoding UTF8
$seedPassword | Set-Content .orchid-initial-password.txt -Encoding UTF8
Write-Host "Initial seed password saved to .orchid-initial-password.txt"
```

### 6. Загрузить `.env` в текущую PowerShell-сессию

API и PM2 берут переменные из текущего процесса. Повторяйте этот шаг в каждой новой сессии терминала перед запуском сервера.

```powershell
Get-Content .env | Where-Object { $_ -match "^\s*[^#].+=" } | ForEach-Object { $name, $value = $_ -split "=", 2; $value = $value.Trim(); if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }; Set-Item -Path "Env:$($name.Trim())" -Value $value }
```

### 7. Сгенерировать Prisma Client

```powershell
corepack pnpm db:generate
```

### 8. Применить миграции

```powershell
corepack pnpm db:migrate
```

### 9. Заполнить базовые данные

Обычный seed создает пользователей, настройки и справочники без демо-заказов.

```powershell
corepack pnpm db:seed
```

Для локальной демо-базы вместо предыдущей команды можно явно запустить демо-seed:

```powershell
corepack pnpm db:seed:demo
```

### 10. Проверить проект перед запуском сервера

```powershell
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
```

### 11. Запустить API и Web через PM2

```powershell
corepack pnpm pm2:start
```

### 12. Проверить здоровье API

```powershell
Invoke-RestMethod http://127.0.0.1:3005/health
```

### 13. Открыть приложение

```powershell
Start-Process http://localhost:5173
```

Данные для первого входа:

- email: `sasha@orchid.local`
- password: пароль из файла `.orchid-initial-password.txt`

Посмотреть пароль:

```powershell
Get-Content .orchid-initial-password.txt
```

После сохранения пароля в менеджере паролей удалите локальную копию:

```powershell
Remove-Item .orchid-initial-password.txt
```

## Ежедневный Запуск После Первой Настройки

Если база и `.env` уже созданы, обычно достаточно:

```powershell
cd C:\projects\orchid-local-saas-obsidian
if (-not (docker ps --format "{{.Names}}" | Where-Object { $_ -eq "orchid-control-postgres-5433" })) { docker start orchid-control-postgres-5433 } else { Write-Host "PostgreSQL already running" }
Get-Content .env | Where-Object { $_ -match "^\s*[^#].+=" } | ForEach-Object { $name, $value = $_ -split "=", 2; $value = $value.Trim(); if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }; Set-Item -Path "Env:$($name.Trim())" -Value $value }
corepack pnpm pm2:start
Start-Process http://localhost:5173
```

Если PM2 уже запущен и нужно перезапустить процессы:

```powershell
corepack pnpm pm2:restart
```

## Режим Разработки

Для разработки с hot reload используйте dev-режим вместо PM2.

```powershell
cd C:\projects\orchid-local-saas-obsidian
if (-not (docker ps --format "{{.Names}}" | Where-Object { $_ -eq "orchid-control-postgres-5433" })) { docker start orchid-control-postgres-5433 } else { Write-Host "PostgreSQL already running" }
Get-Content .env | Where-Object { $_ -match "^\s*[^#].+=" } | ForEach-Object { $name, $value = $_ -split "=", 2; $value = $value.Trim(); if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }; Set-Item -Path "Env:$($name.Trim())" -Value $value }
corepack pnpm dev
```

В dev-режиме Vite проксирует `/api` на `http://127.0.0.1:3005`.

## Полезные Команды

Остановить процессы приложения:

```powershell
corepack pnpm pm2:stop
```

Посмотреть логи:

```powershell
corepack pnpm pm2:logs
```

Открыть Prisma Studio:

```powershell
corepack pnpm db:studio
```

Остановить PostgreSQL:

```powershell
docker stop orchid-control-postgres-5433
```

Обновить проект после `git pull`:

```powershell
git pull
corepack pnpm install
Get-Content .env | Where-Object { $_ -match "^\s*[^#].+=" } | ForEach-Object { $name, $value = $_ -split "=", 2; $value = $value.Trim(); if ($value.StartsWith('"') -and $value.EndsWith('"')) { $value = $value.Substring(1, $value.Length - 2) }; Set-Item -Path "Env:$($name.Trim())" -Value $value }
corepack pnpm db:generate
corepack pnpm db:migrate
corepack pnpm typecheck
corepack pnpm test
corepack pnpm build
corepack pnpm pm2:restart
```

Полностью пересоздать локальную базу можно только если локальные данные не нужны:

```powershell
corepack pnpm --filter @orchid/db prisma migrate reset
```

## Документация

- Canonical documentation root: [docs](docs/README.md).
- Token-efficient development map: [docs/CODEX_CONTEXT.md](docs/CODEX_CONTEXT.md).
- [Project audit](docs/PROJECT_AUDIT.md)
- [Production deploy runbook](DEPLOY.md)
- [API contract](docs/API.md)
- [Design system notes](docs/DESIGN_SYSTEM.md)
- [Roadmap](docs/ROADMAP.md)
- [Deployment notes](docs/DEPLOYMENT.md)
- [Changelog](docs/CHANGELOG.md)

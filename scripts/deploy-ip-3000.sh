#!/usr/bin/env bash
set -Eeuo pipefail

SYSTEM_PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export PATH="$SYSTEM_PATH"

SUPPORTED_UBUNTU_VERSION="${SUPPORTED_UBUNTU_VERSION:-26.04}"
APP_USER="${ORCHID_APP_USER:-orchid}"
APP_DIR="${ORCHID_APP_DIR:-/opt/orchid-control}"
ENV_DIR="${ORCHID_ENV_DIR:-/etc/orchid-control}"
ENV_FILE="${ORCHID_ENV_FILE:-$ENV_DIR/orchid.env}"
INITIAL_PASSWORD_FILE="${ORCHID_INITIAL_PASSWORD_FILE:-$ENV_DIR/initial-admin-password.txt}"
SERVICE_FILE="/etc/systemd/system/orchid-api.service"
PUBLIC_HOST="${ORCHID_PUBLIC_HOST:-${ORCHID_PUBLIC_IP:-}}"
PUBLIC_PORT="${ORCHID_PUBLIC_PORT:-3000}"
API_PORT="${ORCHID_API_PORT:-3005}"
REPO_URL="${ORCHID_REPO_URL:-}"
REPO_REF="${ORCHID_REPO_REF:-main}"
INPUT_DB_NAME="${ORCHID_DB_NAME:-}"
INPUT_DB_USER="${ORCHID_DB_USER:-}"
INPUT_DB_PASSWORD="${ORCHID_DB_PASSWORD:-}"
INPUT_JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-}"
INPUT_JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-}"
INPUT_SEED_PASSWORD="${ORCHID_SEED_PASSWORD:-}"
DB_NAME="${INPUT_DB_NAME:-orchid_control}"
DB_USER="${INPUT_DB_USER:-orchid}"
DB_PASSWORD="$INPUT_DB_PASSWORD"
JWT_ACCESS_SECRET="$INPUT_JWT_ACCESS_SECRET"
JWT_REFRESH_SECRET="$INPUT_JWT_REFRESH_SECRET"
SEED_PASSWORD="$INPUT_SEED_PASSWORD"
NODE_MAJOR="${NODE_MAJOR:-22}"

log() {
  printf '\n==> %s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
}

run_step() {
  local label="$1"
  shift
  log "$label"
  printf '+'
  printf ' %q' "$@"
  printf '\n'
  "$@"
}

run_shell() {
  local label="$1"
  local command="$2"
  log "$label"
  printf '+ %s\n' "$command"
  bash -lc "$command"
}

run_as_app_user() {
  local label="$1"
  local command="$2"
  log "$label"
  printf '+ sudo -u %q -H env PATH=%q bash -lc %q\n' "$APP_USER" "$SYSTEM_PATH" "$command"
  sudo -u "$APP_USER" -H env PATH="$SYSTEM_PATH" bash -lc "$command"
}

random_alnum() {
  local length="${1:-40}"
  local bytes=$(((length + 1) / 2))
  local value
  value="$(openssl rand -hex "$bytes")"
  printf '%s' "${value:0:length}"
}

random_hex() {
  openssl rand -hex "${1:-32}"
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    fail "Run as root: bash scripts/deploy-ip-3000.sh"
  fi
}

check_ubuntu() {
  if [[ ! -r /etc/os-release ]]; then
    fail "/etc/os-release was not found; this script targets Ubuntu Server."
  fi

  # shellcheck disable=SC1091
  . /etc/os-release

  if [[ "${ID:-}" != "ubuntu" ]]; then
    fail "This script targets Ubuntu. Detected ID=${ID:-unknown}."
  fi

  if [[ "${VERSION_ID:-}" != "$SUPPORTED_UBUNTU_VERSION" && "${ORCHID_ALLOW_UNSUPPORTED_UBUNTU:-0}" != "1" ]]; then
    fail "This script targets Ubuntu $SUPPORTED_UBUNTU_VERSION LTS. Detected ${VERSION_ID:-unknown}. Set ORCHID_ALLOW_UNSUPPORTED_UBUNTU=1 to continue anyway."
  fi
}

detect_public_host() {
  if [[ -n "$PUBLIC_HOST" ]]; then
    return
  fi

  if command -v curl >/dev/null 2>&1; then
    PUBLIC_HOST="$(curl -4 -fsS --max-time 5 https://api.ipify.org || true)"
  fi

  if [[ -z "$PUBLIC_HOST" ]]; then
    PUBLIC_HOST="$(hostname -I | awk '{print $1}')"
  fi

  if [[ -z "$PUBLIC_HOST" ]]; then
    fail "Could not detect public IP. Set ORCHID_PUBLIC_HOST=your.server.ip and rerun."
  fi
}

load_existing_env() {
  if [[ ! -f "$ENV_FILE" ]]; then
    return
  fi

  log "Loading existing environment from $ENV_FILE"
  # shellcheck disable=SC1090
  . "$ENV_FILE"

  DB_NAME="${INPUT_DB_NAME:-${ORCHID_DB_NAME:-$DB_NAME}}"
  DB_USER="${INPUT_DB_USER:-${ORCHID_DB_USER:-$DB_USER}}"
  DB_PASSWORD="${INPUT_DB_PASSWORD:-${ORCHID_DB_PASSWORD:-$DB_PASSWORD}}"

  if [[ -z "$DB_PASSWORD" && "${DATABASE_URL:-}" =~ ^postgresql://[^:]+:([^@]+)@ ]]; then
    DB_PASSWORD="${BASH_REMATCH[1]}"
  fi

  JWT_ACCESS_SECRET="${INPUT_JWT_ACCESS_SECRET:-${JWT_ACCESS_SECRET:-}}"
  JWT_REFRESH_SECRET="${INPUT_JWT_REFRESH_SECRET:-${JWT_REFRESH_SECRET:-}}"
  SEED_PASSWORD="${INPUT_SEED_PASSWORD:-${ORCHID_SEED_PASSWORD:-}}"
}

validate_configuration() {
  if [[ -z "$APP_DIR" || "$APP_DIR" == "/" || "$APP_DIR" == "/opt" ]]; then
    fail "Unsafe ORCHID_APP_DIR: $APP_DIR"
  fi

  if [[ ! "$APP_USER" =~ ^[a-z_][a-z0-9_-]*$ ]]; then
    fail "ORCHID_APP_USER must be a safe Linux user name."
  fi

  if [[ ! "$DB_NAME" =~ ^[A-Za-z0-9_]+$ ]]; then
    fail "ORCHID_DB_NAME may contain only letters, numbers, and underscore."
  fi

  if [[ ! "$DB_USER" =~ ^[A-Za-z0-9_]+$ ]]; then
    fail "ORCHID_DB_USER may contain only letters, numbers, and underscore."
  fi

  if [[ ! "$PUBLIC_HOST" =~ ^[A-Za-z0-9.-]+$ ]]; then
    fail "ORCHID_PUBLIC_HOST must be an IP or plain host name without protocol or path."
  fi

  if [[ ! "$PUBLIC_PORT" =~ ^[0-9]+$ || "$PUBLIC_PORT" -lt 1 || "$PUBLIC_PORT" -gt 65535 ]]; then
    fail "ORCHID_PUBLIC_PORT must be a TCP port from 1 to 65535."
  fi

  if [[ ! "$API_PORT" =~ ^[0-9]+$ || "$API_PORT" -lt 1 || "$API_PORT" -gt 65535 ]]; then
    fail "ORCHID_API_PORT must be a TCP port from 1 to 65535."
  fi

  for secret_name in DB_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET SEED_PASSWORD; do
    local secret_value="${!secret_name}"
    if [[ -n "$secret_value" && ! "$secret_value" =~ ^[A-Za-z0-9._~-]+$ ]]; then
      fail "$secret_name may contain only letters, numbers, dot, underscore, tilde, and hyphen. Leave it empty to auto-generate a safe value."
    fi
  done
}

install_system_packages() {
  run_step "Updating apt package index" apt-get update
  run_step "Installing system packages" env DEBIAN_FRONTEND=noninteractive apt-get install -y \
    ca-certificates \
    curl \
    git \
    gnupg \
    nginx \
    openssl \
    postgresql \
    postgresql-contrib \
    rsync \
    sudo \
    ufw
}

install_node() {
  log "Ensuring system Node.js ${NODE_MAJOR}.x and pnpm"

  if [[ ! -x /usr/bin/node || "$(/usr/bin/node -p 'process.versions.node.split(".")[0]' 2>/dev/null || true)" != "$NODE_MAJOR" ]]; then
    run_shell "Adding NodeSource repository" "curl -fsSL 'https://deb.nodesource.com/setup_${NODE_MAJOR}.x' | bash -"
    run_step "Installing Node.js from apt" env DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
  fi

  if [[ ! -x /usr/bin/node ]]; then
    fail "/usr/bin/node was not installed."
  fi

  if [[ ! -x /usr/bin/corepack ]]; then
    run_step "Installing Corepack globally" /usr/bin/npm install -g corepack
  fi

  run_step "Enabling Corepack" /usr/bin/corepack enable
  run_step "Preparing pnpm 9.15.4" /usr/bin/corepack prepare pnpm@9.15.4 --activate
  run_step "Checking pnpm" /usr/bin/corepack pnpm --version
}

ensure_app_user() {
  if ! id -u "$APP_USER" >/dev/null 2>&1; then
    run_step "Creating application user $APP_USER" useradd --system --create-home --home-dir "/var/lib/$APP_USER" --shell /bin/bash "$APP_USER"
  else
    log "Application user $APP_USER already exists"
  fi
}

sync_application() {
  log "Preparing application directory at $APP_DIR"
  run_step "Creating application directory" install -d -m 0755 "$APP_DIR"

  if [[ -n "$REPO_URL" ]]; then
    if [[ -d "$APP_DIR/.git" ]]; then
      run_step "Ensuring application directory ownership" chown -R "$APP_USER:$APP_USER" "$APP_DIR"
      run_as_app_user "Fetching repository" "git -C '$APP_DIR' fetch --prune origin '$REPO_REF'"
      run_as_app_user "Checking out repository ref" "git -C '$APP_DIR' checkout '$REPO_REF'"
      run_as_app_user "Resetting repository to origin ref" "git -C '$APP_DIR' reset --hard 'origin/$REPO_REF'"
    else
      run_step "Removing old non-git application directory" rm -rf "$APP_DIR"
      run_step "Creating owned application directory" install -d -m 0755 -o "$APP_USER" -g "$APP_USER" "$APP_DIR"
      run_as_app_user "Cloning repository" "git clone --branch '$REPO_REF' '$REPO_URL' '$APP_DIR'"
    fi
  else
    local source_dir
    source_dir="$(pwd)"

    if [[ ! -f "$source_dir/package.json" ]]; then
      fail "Run from the Orchid repository root or set ORCHID_REPO_URL."
    fi

    if [[ "$(realpath "$source_dir")" != "$(realpath "$APP_DIR")" ]]; then
      run_step "Copying repository into application directory" rsync -a --delete \
        --exclude '.git/' \
        --exclude 'node_modules/' \
        --exclude 'apps/*/dist/' \
        --exclude 'packages/*/dist/' \
        --exclude 'output/' \
        "$source_dir/" "$APP_DIR/"
    fi
  fi

  run_step "Setting application directory ownership" chown -R "$APP_USER:$APP_USER" "$APP_DIR"
}

configure_postgres() {
  run_step "Starting PostgreSQL" systemctl enable --now postgresql

  DB_PASSWORD="${DB_PASSWORD:-$(random_alnum 40)}"

  local role_exists
  role_exists="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'")"
  if [[ "$role_exists" != "1" ]]; then
    run_step "Creating PostgreSQL user" sudo -u postgres psql -c "CREATE USER \"${DB_USER}\" WITH PASSWORD '${DB_PASSWORD}';"
  else
    run_step "Updating PostgreSQL user password" sudo -u postgres psql -c "ALTER USER \"${DB_USER}\" WITH PASSWORD '${DB_PASSWORD}';"
  fi

  local db_exists
  db_exists="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")"
  if [[ "$db_exists" != "1" ]]; then
    run_step "Creating PostgreSQL database" sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
  else
    log "PostgreSQL database $DB_NAME already exists"
  fi
}

write_env_file() {
  log "Writing HTTP/IP environment"
  run_step "Creating environment directory" install -d -m 0750 -o root -g "$APP_USER" "$ENV_DIR"

  JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-$(random_hex 32)}"
  JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$(random_hex 32)}"

  if [[ -z "$SEED_PASSWORD" ]]; then
    SEED_PASSWORD="$(random_alnum 24)"
    printf '%s\n' "$SEED_PASSWORD" > "$INITIAL_PASSWORD_FILE"
    run_step "Setting initial password file owner" chown root:"$APP_USER" "$INITIAL_PASSWORD_FILE"
    run_step "Setting initial password file permissions" chmod 0640 "$INITIAL_PASSWORD_FILE"
  fi

  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
ORCHID_DB_NAME=${DB_NAME}
ORCHID_DB_USER=${DB_USER}
ORCHID_DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}?schema=public
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
APP_URL=http://${PUBLIC_HOST}:${PUBLIC_PORT}
API_URL=http://${PUBLIC_HOST}:${PUBLIC_PORT}/api
VITE_API_URL=
ORCHID_COOKIE_SECURE=false
ORCHID_SEED_PASSWORD=${SEED_PASSWORD}
PORT=${API_PORT}
HOST=127.0.0.1
EOF

  run_step "Setting environment file owner" chown root:"$APP_USER" "$ENV_FILE"
  run_step "Setting environment file permissions" chmod 0640 "$ENV_FILE"
}

install_and_build_application() {
  run_as_app_user "Checking pnpm as app user" "cd '$APP_DIR' && corepack pnpm --version"
  run_as_app_user "Installing workspace dependencies" "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm install --frozen-lockfile --prod=false"
  run_as_app_user "Generating Prisma client" "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm db:generate"
  run_as_app_user "Building shared package" "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm --filter @orchid/shared build"
  run_as_app_user "Building database package" "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm --filter @orchid/db build"

  if [[ "${ORCHID_SKIP_VERIFY:-0}" != "1" ]]; then
    run_as_app_user "Typechecking workspace" "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm -r typecheck"
    run_as_app_user "Running workspace tests" "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && NODE_ENV=test corepack pnpm -r test"
  fi

  run_as_app_user "Building workspace" "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm -r build"
  run_as_app_user "Applying database migrations" "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm --filter @orchid/db prisma migrate deploy"
  run_as_app_user "Seeding database" "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm db:seed"
}

configure_api_service() {
  log "Configuring orchid-api systemd service"

  cat > "$SERVICE_FILE" <<EOF
[Unit]
Description=Orchid Control API
After=network.target postgresql.service
Wants=postgresql.service

[Service]
Type=simple
User=${APP_USER}
WorkingDirectory=${APP_DIR}
Environment=PATH=${SYSTEM_PATH}
EnvironmentFile=${ENV_FILE}
ExecStart=/usr/bin/node ${APP_DIR}/apps/api/dist/server.js
Restart=always
RestartSec=5
NoNewPrivileges=true
PrivateTmp=true

[Install]
WantedBy=multi-user.target
EOF

  run_step "Reloading systemd" systemctl daemon-reload
  run_step "Enabling API service" systemctl enable orchid-api
  run_step "Restarting API service" systemctl restart orchid-api
  run_step "Checking API service state" systemctl is-active --quiet orchid-api
}

configure_nginx() {
  log "Configuring nginx on port $PUBLIC_PORT"

  cat > /etc/nginx/sites-available/orchid-control <<EOF
server {
    listen ${PUBLIC_PORT};
    listen [::]:${PUBLIC_PORT};
    server_name _;

    root ${APP_DIR}/apps/web/dist;
    index index.html;

    client_max_body_size 10m;

    location /health {
        proxy_pass http://127.0.0.1:${API_PORT}/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:${API_PORT}/api/;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
EOF

  run_step "Enabling nginx site" ln -sfn /etc/nginx/sites-available/orchid-control /etc/nginx/sites-enabled/orchid-control
  run_step "Removing default nginx site" rm -f /etc/nginx/sites-enabled/default
  run_step "Testing nginx config" nginx -t
  run_step "Starting nginx" systemctl enable --now nginx
  run_step "Reloading nginx" systemctl reload nginx
}

configure_firewall() {
  run_step "Allowing SSH through firewall" ufw allow 22/tcp
  run_step "Allowing application port through firewall" ufw allow "${PUBLIC_PORT}/tcp"
  run_step "Enabling firewall" ufw --force enable
}

verify_deployment() {
  run_step "Checking API health directly" curl -fsS "http://127.0.0.1:${API_PORT}/health"
  run_step "Checking nginx health on public port" curl -fsS "http://127.0.0.1:${PUBLIC_PORT}/health"
}

print_summary() {
  log "Deployment complete"
  printf 'Application URL: http://%s:%s\n' "$PUBLIC_HOST" "$PUBLIC_PORT"
  printf 'Health check:    http://%s:%s/health\n' "$PUBLIC_HOST" "$PUBLIC_PORT"
  printf 'Environment:     %s\n' "$ENV_FILE"
  if [[ -f "$INITIAL_PASSWORD_FILE" ]]; then
    printf 'Initial password: %s\n' "$INITIAL_PASSWORD_FILE"
  fi
  printf '\nUseful checks:\n'
  printf '  systemctl status orchid-api --no-pager\n'
  printf '  journalctl -u orchid-api -n 100 --no-pager\n'
  printf '  systemctl status nginx --no-pager\n'
  printf '  curl -fsS http://127.0.0.1:%s/health\n' "$PUBLIC_PORT"
}

main() {
  require_root
  check_ubuntu
  install_system_packages
  detect_public_host
  load_existing_env
  validate_configuration
  install_node
  ensure_app_user
  sync_application
  configure_postgres
  write_env_file
  install_and_build_application
  configure_api_service
  configure_nginx
  configure_firewall
  verify_deployment
  print_summary
}

main "$@"

#!/usr/bin/env bash
set -Eeuo pipefail

SUPPORTED_UBUNTU_VERSION="${SUPPORTED_UBUNTU_VERSION:-26.04}"
APP_USER="${ORCHID_APP_USER:-orchid}"
APP_DIR="${ORCHID_APP_DIR:-/opt/orchid-control}"
ENV_DIR="${ORCHID_ENV_DIR:-/etc/orchid-control}"
ENV_FILE="${ORCHID_ENV_FILE:-$ENV_DIR/orchid.env}"
INITIAL_PASSWORD_FILE="${ORCHID_INITIAL_PASSWORD_FILE:-$ENV_DIR/initial-admin-passwords.txt}"
LEGACY_INITIAL_PASSWORD_FILE="$ENV_DIR/initial-admin-password.txt"
DOMAIN="${ORCHID_DOMAIN:-}"
REPO_URL="${ORCHID_REPO_URL:-}"
REPO_REF="${ORCHID_REPO_REF:-main}"
INPUT_DB_NAME="${ORCHID_DB_NAME:-}"
INPUT_DB_USER="${ORCHID_DB_USER:-}"
INPUT_DB_PASSWORD="${ORCHID_DB_PASSWORD:-}"
INPUT_JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-}"
INPUT_JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-}"
INPUT_SEED_PASSWORD="${ORCHID_SEED_PASSWORD:-}"
INPUT_SEED_PASSWORD_SASHA="${ORCHID_SEED_PASSWORD_SASHA:-}"
INPUT_SEED_PASSWORD_ROMA="${ORCHID_SEED_PASSWORD_ROMA:-}"
INPUT_SEED_PASSWORD_YURA="${ORCHID_SEED_PASSWORD_YURA:-}"
INPUT_SEED_PASSWORD_LENYA="${ORCHID_SEED_PASSWORD_LENYA:-}"
INPUT_SEED_PASSWORD_VANYA="${ORCHID_SEED_PASSWORD_VANYA:-}"
INPUT_SEED_PASSWORD_DIMA="${ORCHID_SEED_PASSWORD_DIMA:-}"
DB_NAME="${INPUT_DB_NAME:-orchid_control}"
DB_USER="${INPUT_DB_USER:-orchid}"
DB_PASSWORD="$INPUT_DB_PASSWORD"
JWT_ACCESS_SECRET="$INPUT_JWT_ACCESS_SECRET"
JWT_REFRESH_SECRET="$INPUT_JWT_REFRESH_SECRET"
SEED_PASSWORD="$INPUT_SEED_PASSWORD"
SEED_PASSWORD_SASHA="$INPUT_SEED_PASSWORD_SASHA"
SEED_PASSWORD_ROMA="$INPUT_SEED_PASSWORD_ROMA"
SEED_PASSWORD_YURA="$INPUT_SEED_PASSWORD_YURA"
SEED_PASSWORD_LENYA="$INPUT_SEED_PASSWORD_LENYA"
SEED_PASSWORD_VANYA="$INPUT_SEED_PASSWORD_VANYA"
SEED_PASSWORD_DIMA="$INPUT_SEED_PASSWORD_DIMA"
ENABLE_LETSENCRYPT="${ORCHID_ENABLE_LETSENCRYPT:-0}"
CERTBOT_EMAIL="${ORCHID_CERTBOT_EMAIL:-}"
NODE_MAJOR="${NODE_MAJOR:-22}"
PM2_BIN="${PM2_BIN:-}"
SEED_USER_KEYS=(SASHA ROMA YURA LENYA VANYA DIMA)
SEED_USER_SPECS=(
  "SASHA|sasha@orchid.local|Саша|OWNER"
  "ROMA|roma@orchid.local|Рома|ADMIN"
  "YURA|yura@orchid.local|Юра|ADMIN"
  "LENYA|lenya@orchid.local|Леня|ADMIN"
  "VANYA|vanya@orchid.local|Ваня|MANAGER"
  "DIMA|dima@orchid.local|Дима|MASTER"
)

log() {
  printf '\n==> %s\n' "$*"
}

fail() {
  printf 'ERROR: %s\n' "$*" >&2
  exit 1
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
    fail "Run as root: sudo -E bash scripts/deploy-ubuntu-lts.sh"
  fi
}

require_domain() {
  if [[ -z "$DOMAIN" ]]; then
    fail "Set ORCHID_DOMAIN, for example: ORCHID_DOMAIN=orchid.example.com"
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

  for seed_user_key in "${SEED_USER_KEYS[@]}"; do
    local input_var="INPUT_SEED_PASSWORD_${seed_user_key}"
    local env_var="ORCHID_SEED_PASSWORD_${seed_user_key}"
    local target_var="SEED_PASSWORD_${seed_user_key}"
    printf -v "$target_var" '%s' "${!input_var:-${!env_var:-${!target_var:-}}}"
  done
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

  if [[ ! "$DOMAIN" =~ ^[A-Za-z0-9.-]+$ ]]; then
    fail "ORCHID_DOMAIN must be a plain domain name without protocol or path."
  fi

  for secret_name in DB_PASSWORD JWT_ACCESS_SECRET JWT_REFRESH_SECRET SEED_PASSWORD SEED_PASSWORD_SASHA SEED_PASSWORD_ROMA SEED_PASSWORD_YURA SEED_PASSWORD_LENYA SEED_PASSWORD_VANYA SEED_PASSWORD_DIMA; do
    local secret_value="${!secret_name}"
    if [[ -n "$secret_value" && ! "$secret_value" =~ ^[A-Za-z0-9._~-]+$ ]]; then
      fail "$secret_name may contain only letters, numbers, dot, underscore, tilde, and hyphen. Leave it empty to auto-generate a safe value."
    fi
  done
}

ensure_seed_passwords() {
  for seed_user_key in "${SEED_USER_KEYS[@]}"; do
    local target_var="SEED_PASSWORD_${seed_user_key}"

    if [[ -z "${!target_var}" ]]; then
      printf -v "$target_var" '%s' "$(random_alnum 24)"
    fi
  done
}

write_seed_password_file() {
  {
    printf 'email | name | role | password\n'

    for seed_user_spec in "${SEED_USER_SPECS[@]}"; do
      IFS='|' read -r seed_user_key seed_user_email seed_user_name seed_user_role <<<"$seed_user_spec"
      local target_var="SEED_PASSWORD_${seed_user_key}"
      printf '%s | %s | %s | %s\n' "$seed_user_email" "$seed_user_name" "$seed_user_role" "${!target_var}"
    done
  } > "$INITIAL_PASSWORD_FILE"

  chown root:"$APP_USER" "$INITIAL_PASSWORD_FILE"
  chmod 0640 "$INITIAL_PASSWORD_FILE"

  if [[ "$INITIAL_PASSWORD_FILE" != "$LEGACY_INITIAL_PASSWORD_FILE" ]]; then
    cp "$INITIAL_PASSWORD_FILE" "$LEGACY_INITIAL_PASSWORD_FILE"
    chown root:"$APP_USER" "$LEGACY_INITIAL_PASSWORD_FILE"
    chmod 0640 "$LEGACY_INITIAL_PASSWORD_FILE"
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

install_system_packages() {
  log "Installing system packages"
  apt-get update
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
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
  log "Installing Node.js ${NODE_MAJOR}.x and PM2"
  if ! command -v node >/dev/null 2>&1 || [[ "$(node -p 'process.versions.node.split(".")[0]')" != "$NODE_MAJOR" ]]; then
    curl -fsSL "https://deb.nodesource.com/setup_${NODE_MAJOR}.x" | bash -
    DEBIAN_FRONTEND=noninteractive apt-get install -y nodejs
  fi

  if ! command -v corepack >/dev/null 2>&1; then
    npm install -g corepack
  fi

  corepack enable
  corepack prepare pnpm@9.15.4 --activate
  npm install -g pm2@5.4.3
  PM2_BIN="$(command -v pm2)"
  if [[ -z "$PM2_BIN" ]]; then
    fail "pm2 was installed but was not found in root PATH."
  fi
}

ensure_app_user() {
  log "Ensuring application user"
  if ! id -u "$APP_USER" >/dev/null 2>&1; then
    useradd --system --create-home --home-dir "/var/lib/$APP_USER" --shell /bin/bash "$APP_USER"
  fi
}

sync_application() {
  log "Preparing application directory at $APP_DIR"
  install -d -m 0755 "$APP_DIR"

  if [[ -n "$REPO_URL" ]]; then
    if [[ -d "$APP_DIR/.git" ]]; then
      chown -R "$APP_USER:$APP_USER" "$APP_DIR"
      run_as_app_user "git -C '$APP_DIR' fetch --prune origin '$REPO_REF'"
      run_as_app_user "git -C '$APP_DIR' checkout '$REPO_REF'"
      run_as_app_user "git -C '$APP_DIR' reset --hard 'origin/$REPO_REF'"
    else
      rm -rf "$APP_DIR"
      install -d -m 0755 -o "$APP_USER" -g "$APP_USER" "$APP_DIR"
      run_as_app_user "git clone --branch '$REPO_REF' '$REPO_URL' '$APP_DIR'"
    fi
  else
    local source_dir
    source_dir="$(pwd)"

    if [[ ! -f "$source_dir/package.json" ]]; then
      fail "Run from the Orchid repository root or set ORCHID_REPO_URL."
    fi

    if [[ "$(realpath "$source_dir")" != "$(realpath "$APP_DIR")" ]]; then
      rsync -a --delete \
        --exclude '.git/' \
        --exclude 'node_modules/' \
        --exclude 'apps/*/dist/' \
        --exclude 'packages/*/dist/' \
        --exclude 'output/' \
        "$source_dir/" "$APP_DIR/"
    fi
  fi

  chown -R "$APP_USER:$APP_USER" "$APP_DIR"
}

configure_postgres() {
  log "Configuring PostgreSQL database"
  systemctl enable --now postgresql

  DB_PASSWORD="${DB_PASSWORD:-$(random_alnum 40)}"

  local role_exists
  role_exists="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='${DB_USER}'")"
  if [[ "$role_exists" != "1" ]]; then
    sudo -u postgres psql -c "CREATE USER \"${DB_USER}\" WITH PASSWORD '${DB_PASSWORD}';"
  else
    sudo -u postgres psql -c "ALTER USER \"${DB_USER}\" WITH PASSWORD '${DB_PASSWORD}';"
  fi

  local db_exists
  db_exists="$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_database WHERE datname='${DB_NAME}'")"
  if [[ "$db_exists" != "1" ]]; then
    sudo -u postgres createdb -O "$DB_USER" "$DB_NAME"
  fi
}

write_env_file() {
  log "Writing production environment"
  install -d -m 0750 -o root -g "$APP_USER" "$ENV_DIR"

  JWT_ACCESS_SECRET="${JWT_ACCESS_SECRET:-$(random_hex 32)}"
  JWT_REFRESH_SECRET="${JWT_REFRESH_SECRET:-$(random_hex 32)}"

  ensure_seed_passwords
  write_seed_password_file

  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
ORCHID_DB_NAME=${DB_NAME}
ORCHID_DB_USER=${DB_USER}
ORCHID_DB_PASSWORD=${DB_PASSWORD}
DATABASE_URL=postgresql://${DB_USER}:${DB_PASSWORD}@127.0.0.1:5432/${DB_NAME}?schema=public
JWT_ACCESS_SECRET=${JWT_ACCESS_SECRET}
JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
APP_URL=https://${DOMAIN}
API_URL=https://${DOMAIN}/api
VITE_API_URL=
ORCHID_SEED_PASSWORD_SASHA=${SEED_PASSWORD_SASHA}
ORCHID_SEED_PASSWORD_ROMA=${SEED_PASSWORD_ROMA}
ORCHID_SEED_PASSWORD_YURA=${SEED_PASSWORD_YURA}
ORCHID_SEED_PASSWORD_LENYA=${SEED_PASSWORD_LENYA}
ORCHID_SEED_PASSWORD_VANYA=${SEED_PASSWORD_VANYA}
ORCHID_SEED_PASSWORD_DIMA=${SEED_PASSWORD_DIMA}
PORT=3005
HOST=127.0.0.1
EOF

  chown root:"$APP_USER" "$ENV_FILE"
  chmod 0640 "$ENV_FILE"
}

run_as_app_user() {
  sudo -u "$APP_USER" -H bash -lc "$*"
}

install_and_build_application() {
  log "Installing dependencies and building application"
  run_as_app_user "cd '$APP_DIR' && corepack pnpm --version"
  run_as_app_user "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm install --frozen-lockfile --prod=false"
  run_as_app_user "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm db:generate"
  run_as_app_user "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm --filter @orchid/shared build"
  run_as_app_user "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm --filter @orchid/db build"

  if [[ "${ORCHID_SKIP_VERIFY:-0}" != "1" ]]; then
    run_as_app_user "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm -r typecheck"
    run_as_app_user "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && NODE_ENV=test corepack pnpm -r test"
  fi

  run_as_app_user "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm -r build"
  run_as_app_user "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm --filter @orchid/db prisma migrate deploy"
  run_as_app_user "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && corepack pnpm db:seed"
}

configure_pm2() {
  log "Starting API with PM2"
  run_as_app_user "cd '$APP_DIR' && set -a && source '$ENV_FILE' && set +a && '$PM2_BIN' startOrReload ecosystem.config.cjs --only orchid-api --update-env"
  run_as_app_user "'$PM2_BIN' save"

  env PATH="$PATH:/usr/bin:/usr/local/bin" "$PM2_BIN" startup systemd -u "$APP_USER" --hp "/var/lib/$APP_USER" >/tmp/orchid-pm2-startup.txt
  systemctl enable "pm2-$APP_USER" >/dev/null 2>&1 || true
}

configure_nginx() {
  log "Configuring nginx"
  local cert_dir="/etc/letsencrypt/live/${DOMAIN}"

  if [[ -f "$cert_dir/fullchain.pem" && -f "$cert_dir/privkey.pem" ]]; then
    cat > /etc/nginx/sites-available/orchid-control <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};
    return 301 https://\$host\$request_uri;
}

server {
    listen 443 ssl;
    listen [::]:443 ssl;
    server_name ${DOMAIN};

    ssl_certificate ${cert_dir}/fullchain.pem;
    ssl_certificate_key ${cert_dir}/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_prefer_server_ciphers off;

    root ${APP_DIR}/apps/web/dist;
    index index.html;

    client_max_body_size 10m;

    location /health {
        proxy_pass http://127.0.0.1:3005/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3005/api/;
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
  else
    cat > /etc/nginx/sites-available/orchid-control <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name ${DOMAIN};

    root ${APP_DIR}/apps/web/dist;
    index index.html;

    client_max_body_size 10m;

    location /health {
        proxy_pass http://127.0.0.1:3005/health;
        proxy_http_version 1.1;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3005/api/;
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
  fi

  ln -sfn /etc/nginx/sites-available/orchid-control /etc/nginx/sites-enabled/orchid-control
  rm -f /etc/nginx/sites-enabled/default
  nginx -t
  systemctl enable --now nginx
  systemctl reload nginx
}

configure_firewall() {
  log "Configuring firewall"
  ufw allow OpenSSH
  ufw allow 'Nginx Full'
  ufw --force enable
}

configure_letsencrypt() {
  if [[ "$ENABLE_LETSENCRYPT" != "1" ]]; then
    return
  fi

  if [[ -z "$CERTBOT_EMAIL" ]]; then
    fail "Set ORCHID_CERTBOT_EMAIL when ORCHID_ENABLE_LETSENCRYPT=1."
  fi

  log "Configuring Let's Encrypt certificate"
  DEBIAN_FRONTEND=noninteractive apt-get install -y certbot python3-certbot-nginx
  certbot --nginx \
    --non-interactive \
    --agree-tos \
    --redirect \
    --email "$CERTBOT_EMAIL" \
    -d "$DOMAIN"
}

print_summary() {
  log "Deployment complete"
  printf 'Application URL: https://%s\n' "$DOMAIN"
  printf 'Health check:    https://%s/health\n' "$DOMAIN"
  printf 'Environment:     %s\n' "$ENV_FILE"
  if [[ -f "$INITIAL_PASSWORD_FILE" ]]; then
    printf 'Seed passwords:  %s\n' "$INITIAL_PASSWORD_FILE"
    printf '\nSeed user credentials:\n'
    sed 's/^/  /' "$INITIAL_PASSWORD_FILE"
  fi
  printf '\nUseful checks:\n'
  printf '  sudo -u %s -H %s status\n' "$APP_USER" "$PM2_BIN"
  printf '  sudo -u %s -H %s logs orchid-api\n' "$APP_USER" "$PM2_BIN"
  printf '  curl -fsS https://%s/health\n' "$DOMAIN"
}

main() {
  require_root
  require_domain
  check_ubuntu
  load_existing_env
  validate_configuration
  install_system_packages
  install_node
  ensure_app_user
  sync_application
  configure_postgres
  write_env_file
  install_and_build_application
  configure_pm2
  configure_nginx
  configure_firewall
  configure_letsencrypt
  print_summary
}

main "$@"

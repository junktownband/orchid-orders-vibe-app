#!/usr/bin/env bash
set -Eeuo pipefail

SYSTEM_PATH="/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin"
export PATH="$SYSTEM_PATH"

APP_USER="${ORCHID_APP_USER:-orchid}"
APP_DIR="${ORCHID_APP_DIR:-/opt/orchid-control}"
ENV_DIR="${ORCHID_ENV_DIR:-/etc/orchid-control}"
ENV_FILE="${ORCHID_ENV_FILE:-$ENV_DIR/orchid.env}"
PUBLIC_PORT="${ORCHID_PUBLIC_PORT:-3000}"
API_PORT="${ORCHID_API_PORT:-3005}"
REPO_URL="${ORCHID_REPO_URL:-}"
REPO_REF="${ORCHID_REPO_REF:-main}"
SERVICE_NAME="${ORCHID_API_SERVICE:-orchid-api}"

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

run_as_app_user() {
  local label="$1"
  local command="$2"
  log "$label"
  printf '+ sudo -u %q -H env PATH=%q bash -lc %q\n' "$APP_USER" "$SYSTEM_PATH" "$command"
  sudo -u "$APP_USER" -H env PATH="$SYSTEM_PATH" bash -lc "$command"
}

require_root() {
  if [[ "${EUID}" -ne 0 ]]; then
    fail "Run as root: bash scripts/update-ip-3000.sh"
  fi
}

validate_existing_install() {
  [[ -d "$APP_DIR" ]] || fail "Application directory was not found: $APP_DIR"
  [[ -f "$ENV_FILE" ]] || fail "Environment file was not found: $ENV_FILE"
  id -u "$APP_USER" >/dev/null 2>&1 || fail "Application user was not found: $APP_USER"

  if [[ ! -f "$APP_DIR/package.json" && -z "$REPO_URL" ]]; then
    fail "Application package.json was not found in $APP_DIR. Set ORCHID_REPO_URL or run the full deploy first."
  fi

  if ! command -v corepack >/dev/null 2>&1; then
    fail "corepack was not found. Run scripts/deploy-ip-3000.sh once before using update-only."
  fi
}

sync_application() {
  log "Updating application code in $APP_DIR"

  if [[ -n "$REPO_URL" || -d "$APP_DIR/.git" ]]; then
    run_step "Ensuring application directory ownership" chown -R "$APP_USER:$APP_USER" "$APP_DIR"

    if [[ ! -d "$APP_DIR/.git" ]]; then
      fail "ORCHID_REPO_URL was set, but $APP_DIR is not a git checkout. Run the full deploy first."
    fi

    run_as_app_user "Fetching repository" "git -C '$APP_DIR' fetch --prune origin '$REPO_REF'"
    run_as_app_user "Checking out repository ref" "git -C '$APP_DIR' checkout '$REPO_REF'"
    run_as_app_user "Resetting repository to origin ref" "git -C '$APP_DIR' reset --hard 'origin/$REPO_REF'"
    return
  fi

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
  else
    log "Application directory already points at the current repository."
  fi

  run_step "Setting application directory ownership" chown -R "$APP_USER:$APP_USER" "$APP_DIR"
}

install_build_and_migrate() {
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
}

restart_services() {
  run_step "Restarting API service" systemctl restart "$SERVICE_NAME"
  run_step "Checking API service state" systemctl is-active --quiet "$SERVICE_NAME"

  if command -v nginx >/dev/null 2>&1; then
    run_step "Testing nginx config" nginx -t
    run_step "Reloading nginx" systemctl reload nginx
  else
    log "nginx was not found; skipping nginx reload."
  fi
}

verify_update() {
  run_step "Checking API health directly" curl -fsS "http://127.0.0.1:${API_PORT}/health"
  run_step "Checking nginx health on public port" curl -fsS "http://127.0.0.1:${PUBLIC_PORT}/health"
}

print_summary() {
  log "Update complete"
  printf 'Application directory: %s\n' "$APP_DIR"
  printf 'Environment:           %s\n' "$ENV_FILE"
  printf 'Updated ref:           %s\n' "$REPO_REF"
  printf '\nUseful checks:\n'
  printf '  systemctl status %s --no-pager\n' "$SERVICE_NAME"
  printf '  journalctl -u %s -n 100 --no-pager\n' "$SERVICE_NAME"
  printf '  curl -fsS http://127.0.0.1:%s/health\n' "$PUBLIC_PORT"
}

main() {
  require_root
  validate_existing_install
  sync_application
  install_build_and_migrate
  restart_services
  verify_update
  print_summary
}

main "$@"

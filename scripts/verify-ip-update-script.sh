#!/usr/bin/env bash
set -Eeuo pipefail

script="scripts/update-ip-3000.sh"

[[ -f "$script" ]]
bash -n "$script"
grep -q 'ORCHID_APP_DIR:-/opt/orchid-control' "$script"
grep -q "corepack pnpm install --frozen-lockfile --prod=false" "$script"
grep -q "corepack pnpm -r build" "$script"
grep -q "prisma migrate deploy" "$script"
grep -q "systemctl restart" "$script"
grep -q "curl -fsS \"http://127.0.0.1:\${API_PORT}/health\"" "$script"
grep -q "curl -fsS \"http://127.0.0.1:\${PUBLIC_PORT}/health\"" "$script"

if grep -Eq "apt-get|createdb|CREATE USER|ORCHID_SEED_PASSWORD|initial-admin-password|ufw allow|ufw --force|systemctl enable|sites-available" "$script"; then
  echo "Update-only script must not bootstrap system packages, database roles, seed passwords, firewall, or nginx site files." >&2
  exit 1
fi

#!/usr/bin/env bash
set -Eeuo pipefail

script="scripts/deploy-ip-3000.sh"

[[ -f "$script" ]]
bash -n "$script"
grep -q 'PUBLIC_PORT="${ORCHID_PUBLIC_PORT:-3000}"' "$script"
grep -q "listen \${PUBLIC_PORT};" "$script"
grep -q "ORCHID_COOKIE_SECURE=false" "$script"
grep -q "ORCHID_SEED_PASSWORD_SASHA" "$script"
grep -q "initial-admin-passwords.txt" "$script"
grep -q "Seed user credentials:" "$script"
grep -q "orchid-api.service" "$script"
grep -q "run_step" "$script"
grep -q "curl -fsS \"http://127.0.0.1:\${API_PORT}/health\"" "$script"
grep -q "curl -fsS \"http://127.0.0.1:\${PUBLIC_PORT}/health\"" "$script"

if grep -Eq "certbot|letsencrypt|PM2|pm2" "$script"; then
  echo "IP-only deploy script must not depend on certificates or PM2." >&2
  exit 1
fi

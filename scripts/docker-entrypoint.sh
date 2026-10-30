#!/bin/sh
set -eu
node scripts/migrate.mjs
node scripts/import-initial-cards.mjs
exec "$@"

#!/bin/sh
set -eu
umask 077
mkdir -p backups
out="backups/picker-$(date +%Y%m%dT%H%M%S)-$$.dump"
if docker compose exec -T db pg_dump -U picker -d picker --format=custom > "$out"; then
  printf 'Database backup saved: %s\n' "$out"
else
  rm -f "$out"
  exit 1
fi

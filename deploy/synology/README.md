# Run Picker on Synology

The GitHub workflow publishes **ghcr.io/wjdecorte/picker** after tests pass. `latest` follows `main`; `sha-<full-commit>` pins a specific build. Pushing `v1.2.3` additionally creates `1.2.3` and `1.2` tags. Release-tag builds do not replace `latest`. Native Intel and ARM GitHub runners build the two variants in parallel; the workflow verifies both architectures before publishing the shared tags. The image includes amd64 and arm64 variants; Docker chooses the matching one. Older 32-bit ARM NAS models are not supported by this image. The NAS must support Docker/Container Manager and Compose v2.

Workflow: [Build and publish Docker image](https://github.com/wjdecorte/picker/actions/workflows/image.yaml). Builds run on main pushes, version tags and manual dispatch. Pull requests run tests/build validation but cannot publish. Publishing uses GitHub’s built-in token, not a personal credential stored in the repository. `.env`, database files, private backups and Git metadata are excluded from image builds.

## 1. Registry access

A new GHCR package is private by default. Its visibility is not changed by this workflow. For a private package, sign in **on the NAS** using a GitHub personal access token (classic) with `read:packages` permission and access to this repository/package:

```sh
docker login ghcr.io -u wjdecorte
```

Enter the token at the password prompt. Do not enter it into Compose, `.env`, Git, or the Actions workflow. If you explicitly make the package public in GitHub’s package settings, anonymous pulls work instead. Repository visibility and container-package visibility are separate settings.

## 2. Create the Container Manager project

Copy `compose.yaml` and `.env.example` from this directory to `/volume1/docker/picker` on the NAS. These files pull the published app image; Node.js, source code and local image building are not needed on the NAS.

```sh
cd /volume1/docker/picker
cp .env.example .env
chmod 600 .env
openssl rand -hex 24
```

Set `POSTGRES_PASSWORD` in `.env` to that random value. Keep the password URL-safe (hex works). Do not change it later without also changing the PostgreSQL role password. Set `PICKER_IMAGE` to `latest`, a `sha-...` tag, or an immutable image digest from the registry. Both the root and this directory’s Compose files pull the published image. The NAS port defaults to **8756**; the container port remains 3000. Existing `.env` files override defaults, so update `APP_PORT=8756` and the matching `APP_ORIGIN` without changing the database password.

```sh
# If transferring current Mac data, follow step 4 before starting the app.
docker compose pull
docker compose up -d --wait
docker compose ps
```

The app runs as an unprivileged user. PostgreSQL uses the persistent `picker_postgres_data` volume and has no published port. Database migrations run before the app starts. A new database initializes from the historical seed on the first dashboard access; your Mac’s live PostgreSQL data is not part of the image. See the data-transfer step below if you want the exact current records.

## 3. Open the dashboard on your home network

Set the following in the NAS `.env`, replacing `YOUR_NAS_IP` with the NAS private IP or local hostname:

```dotenv
APP_PORT=8756
APP_ORIGIN=http://YOUR_NAS_IP:8756
```

Then apply the latest image and configuration:

```sh
docker compose pull app
docker compose up -d app
```

Open **http://YOUR_NAS_IP:8756** from a device on your home network. The app is published on NAS port 8756 and forwards to container port 3000; PostgreSQL stays internal. No SSH tunnel is needed. Allow TCP 8756 from your home subnet in the Synology firewall if it is enabled.

Compose explicitly sets `ALLOW_LAN_ACCESS=true`. Browser writes still require the configured origin and matching Host header. Set `APP_ORIGIN` to the exact address you use, including port; requests from other origins/hosts are rejected. Private IPv4 addresses, IPv6 ULA addresses, `.local`/`.lan`/`.home.arpa` names and single-label NAS names are supported. This is trusted-home-network access without a sign-in screen: anyone who can reach this port can read the dashboard and use the permitted local interface. Keep it on the home network; authentication remains a prerequisite for Internet exposure. Do not forward the port on your router.

## 4. Transfer current PostgreSQL data (optional, before first app use)

On your Mac, create a fresh backup:

```sh
cd /Users/jason/Projects/picker
npm run db:backup
```

Securely copy that `.dump` file to the NAS project folder. In a **fresh NAS project**, start only PostgreSQL, then restore before starting the app (and before entrypoint migrations create its tables):

```sh
cd /volume1/docker/picker
docker compose up -d --wait db
docker compose exec -T db pg_restore -U picker -d picker \
  --no-owner --no-privileges --single-transaction < picker-backup.dump
docker compose up -d --wait app
```

The restore includes schema and migration history. Existing migration checksums are verified when the app starts. This procedure is for an empty database: it intentionally has no `--clean` or volume-deletion step. If you already opened the NAS app, use a separate fresh database/project for the restore; preserve the existing volume until the restore is verified. Compare records before retiring the Mac installation. Pick one installation as the authoritative writer afterward; the databases do not sync.

## 5. Pull updates and keep backups

```sh
cd /volume1/docker/picker
mkdir -p backups
docker compose exec -T db pg_dump -U picker -d picker -Fc > "backups/picker-$(date +%Y%m%dT%H%M%S).dump"
docker compose pull app
docker compose up -d --wait app
```

Use a previous immutable image digest to roll back application code. Database migrations may require a matching backup restore; changing the image alone does not reverse a schema migration. Keep off-NAS backups. Never use `docker compose down -v` to update the app; that removes database storage.

References: [GitHub container registry authentication](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry), [Docker multi-platform builds](https://docs.docker.com/build/ci/github-actions/multi-platform/).

## Current sportsbook spreads

The updated image retrieves ESPN pregame odds alongside scores and displays the named sportsbook (DraftKings when available), selected-team spread and check time. No API key or extra environment variable is needed. Use **Refresh scores & lines** for an immediate check; page-open updates run every 90 seconds. Pull the updated image after its GitHub build completes. Saved pick lines and sealed initial cards never change. Closing spreads remain separate and manual; last pregame quotes are not asserted to be verified closing lines.

### Prediction snapshot comparisons
After pulling the updated app image, open **Weekly review → Week 7 → Original vs Sunday Recheck** (also available under Manage picks). The saved October 25 recheck is already in the NAS database; do not re-import it. Its four pregame selections were recorded before their kickoffs; the other ten supplied proposals remain excluded audit entries. Original versions were preserved. Future rechecks use **Add a separate snapshot**, with server-time validation and independent grading. Updating the app container requires no database reset or new environment variables.

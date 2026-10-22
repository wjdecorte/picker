# Run Picker on Synology

The GitHub workflow publishes **ghcr.io/wjdecorte/picker** after tests pass. `latest` follows `main`; `sha-<full-commit>` pins a specific build. Pushing `v1.2.3` additionally creates `1.2.3` and `1.2` tags. Release-tag builds do not replace `latest`. The image includes amd64 and arm64 variants; Docker chooses the matching one. Older 32-bit ARM NAS models are not supported by this image. The NAS must support Docker/Container Manager and Compose v2.

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

Set `POSTGRES_PASSWORD` in `.env` to that random value. Keep the password URL-safe (hex works). Do not change it later without also changing the PostgreSQL role password. Set `PICKER_IMAGE` to `latest`, a `sha-...` tag, or the immutable image digest shown in the workflow summary. The repository’s root Compose file builds locally; **use this directory’s Compose file on Synology**.

```sh
docker compose pull
docker compose up -d --wait
docker compose ps
```

The app runs as an unprivileged user. PostgreSQL uses the persistent `picker_postgres_data` volume and has no published port. Database migrations run before the app starts. A new database initializes from the historical seed on the first dashboard access; your Mac’s live PostgreSQL data is not part of the image. See the data-transfer step below if you want the exact current records.

## 3. Open the dashboard securely

Picker currently supports local single-user access. Keep the Compose binding on NAS loopback; there is no remote browser authentication yet. Use an SSH tunnel from your Mac:

```sh
ssh -N -L 18080:127.0.0.1:3000 YOUR_NAS_USER@YOUR_NAS_HOST
```

Then open **http://localhost:18080** on the Mac. This matches `APP_ORIGIN` in the sample. If NAS port 3000 is occupied, change `APP_PORT` and the tunnel’s destination port together. If Mac port 18080 changes, update `APP_ORIGIN` as well. Do not put a service token in browser code or open an unauthenticated LAN/public app port. Authentication and remote deployment are tracked in `TODO.md`.

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

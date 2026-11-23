# Updating the upstream version

Upstream is the `solidtime/solidtime` image on Docker Hub, tagged with the bare release version
(`0.23.0`, no `v`). The package also pins a PostgreSQL and a Gotenberg image, which move only
when they need to.

## Determining the upstream version

```bash
gh release view -R solidtime-io/solidtime --json tagName -q .tagName
```

The release tag carries a `v`; the image tag does not. Confirm the image exists for both
architectures before bumping:

```bash
docker manifest inspect solidtime/solidtime:<version> | jq -r '.manifests[].platform | "\(.os)/\(.architecture)"'
```

## Applying the bump

1. Set `images.solidtime.source.dockerTag` in `startos/manifest/index.ts` to the new tag.
2. Set `version` in `startos/versions/current.ts` to `<version>:0`, and replace its release
   notes.
3. Read the release notes and the diff of `docker/prod/` for anything that touches what the
   package runs itself rather than through upstream's `start-container`: the
   `octane:frankenphp` command line and Caddyfile path, `queue:work`, the supercronic crontab,
   and the storage directories the `storage` oneshot creates (all in `startos/main.ts`). Check
   `config/` for renamed environment variables (`baseEnv` and `mailEnv` in `startos/utils.ts`).
4. The `migrate` oneshot applies upstream's database migrations on start; nothing else is needed
   for them.

## PostgreSQL

`postgres` is pinned to a 17.x Alpine tag; upstream's CI tests 15, 16 and 17. A patch bump within
17 is safe. A new major cannot read the old data directory, so moving major versions needs a
dump-and-restore migration and a new `pgdataSubpath` in `startos/utils.ts`; never change the major
in place.

## Gotenberg

`gotenberg` is pinned to an 8.x `-chromium` tag, the major upstream's own compose file uses.
solidtime only renders through Gotenberg's Chromium route, so the LibreOffice variants are not
needed. Move to a new major only after upstream's compose file does.

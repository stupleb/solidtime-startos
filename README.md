<p align="center">
  <img src="icon.svg" alt="solidtime Logo" width="21%">
</p>

# solidtime on StartOS

> Everything not listed in this document should behave the same as upstream solidtime.
> If a feature, setting, or behavior is not mentioned here, the upstream
> documentation is accurate and fully applicable — see the Documentation section of
> `instructions.md` for links.

[solidtime](https://github.com/solidtime-io/solidtime) is a time tracker for freelancers and
teams. This package runs it with its own PostgreSQL database and a Gotenberg renderer for PDF
exports, creates the first account itself, and keeps public sign-up off until the user opens it.

---

## Table of Contents

- [Image and Container Runtime](#image-and-container-runtime)
- [Volume and Data Layout](#volume-and-data-layout)
- [File Models](#file-models)
- [Dependencies](#dependencies)
- [Network Access and Interfaces](#network-access-and-interfaces)
- [Installation and First-Run Flow](#installation-and-first-run-flow)
- [Actions](#actions)
- [Tasks](#tasks)
- [Health Checks](#health-checks)
- [Backups and Restore](#backups-and-restore)
- [Limitations and Differences](#limitations-and-differences)
- [Quick Reference for AI Consumers](#quick-reference-for-ai-consumers)

---

## Image and Container Runtime

Three upstream images, unmodified, for x86_64 and aarch64. The package does not use the solidtime
image's `start-container` entrypoint or its supervisord; StartOS runs each process as its own
daemon and restarts it if it exits.

| Subcontainer | Image                            | Runs                                                                                                                                                                 |
| ------------ | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `postgres`   | `postgres` (Alpine)              | PostgreSQL, listening on `127.0.0.1` only                                                                                                                            |
| `worker`     | `solidtime/solidtime`            | the `storage`, `migrate` and `setup` oneshots, then the `worker` (`php artisan queue:work`) and `scheduler` (supercronic running `schedule:run` each minute) daemons |
| `app`        | `solidtime/solidtime`            | `storage:link` and `optimize`, then Laravel Octane on FrankenPHP, serving port 8000                                                                                  |
| `gotenberg`  | `gotenberg/gotenberg` (Chromium) | the PDF renderer, on `127.0.0.1:3000`; Chromium starts on the first render                                                                                           |

Start order: `pg-recover` (removes a stale `postmaster.pid`) → `postgres`; `storage` (creates the
directories Laravel needs and hands the volume to uid 1000) → `migrate` (`php artisan migrate`) →
`setup` (creates the personal-access OAuth client if missing, applies a pending admin password, and
picks up a changed admin email) → `app`, `worker`, `scheduler`. `gotenberg` starts independently.

The scheduler logs `process reaping disabled, not pid 1` on every start; that is expected,
since StartOS's own init reaps its processes. To run a solidtime command by hand:
`start-cli package attach solidtime -n worker -- php artisan <command>`. An attached command does not inherit the daemon's environment, so commands that need the database
fail that way; use the actions instead.

## Volume and Data Layout

Three volumes.

| Volume    | Mounted at                                    | Holds                                                                                                                 |
| --------- | --------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `startos` | not mounted                                   | `store.json`: generated secrets and the package's settings                                                            |
| `db`      | `/var/lib/postgresql` in `postgres`           | the PostgreSQL cluster (data directory `data`): every user, organization, project, time entry, session and queued job |
| `storage` | `/var/www/html/storage` in `app` and `worker` | Laravel's `storage/`: uploaded and generated files (`app/`), the file cache, compiled views                           |

## File Models

One file model, `store.json` on the `startos` volume. solidtime itself is configured entirely by
environment variables the package sets on every start; there is no `.env` or config file on disk,
and nothing there can be edited by hand.

| Key                                                 | Seeded                                                 | Rewritten by                                                                                   |
| --------------------------------------------------- | ------------------------------------------------------ | ---------------------------------------------------------------------------------------------- |
| `postgresPassword`                                  | at install                                             | never                                                                                          |
| `appKey`, `passportPrivateKey`, `passportPublicKey` | at install, from `php artisan self-host:generate-keys` | never                                                                                          |
| `adminUserId`, `adminName`                          | by **Create Admin Account**                            | never                                                                                          |
| `adminEmail`                                        | by **Create Admin Account**                            | the `setup` oneshot, when the admin's email changed in solidtime                               |
| `adminPassword`, `adminPending`                     | by **Create Admin Account**                            | **Reset Admin Password**; `setup` clears `adminPending` once the password reaches the database |
| `primaryUrl`                                        | empty                                                  | **Set Primary URL**                                                                            |
| `signUp`                                            | `off`                                                  | **Configure Sign-up**                                                                          |
| `smtp`                                              | disabled                                               | **Configure SMTP**                                                                             |

`appKey` encrypts sessions and other values solidtime stores; the Passport keys sign every OAuth
and API token. Changing any of them by hand signs everyone out and invalidates every API token and
connected app — don't.

Environment set on every start, from the store and from StartOS: `APP_URL` (the primary URL, or the
interface's preferred address until one is chosen), `TRUSTED_HOSTS` (every hostname of the Web UI
interface), `APP_ENABLE_REGISTRATION`, `SUPER_ADMINS` (the admin's current email), the `MAIL_*` variables, the
database credentials and keys. Fixed values: `APP_FORCE_HTTPS=true`, `LOG_CHANNEL=stderr`,
`QUEUE_CONNECTION=database`, `GOTENBERG_URL`, and telemetry and the update check off. A change
through an action restarts solidtime.

## Dependencies

None.

## Network Access and Interfaces

One interface.

| Interface | Id   | Type | Port | Purpose                                                                                     |
| --------- | ---- | ---- | ---- | ------------------------------------------------------------------------------------------- |
| Web UI    | `ui` | `ui` | 8000 | the web app, its REST API under `/api/v1`, OAuth sign-in for the desktop app and extensions |

solidtime rejects any request whose hostname is not one of the interface's addresses; the package
lists all of them in `TRUSTED_HOSTS` and updates the list when an address is added or removed,
which restarts solidtime. A request on any other name (for example through a reverse proxy the user
runs elsewhere) gets solidtime's untrusted-host error page.

Gotenberg and PostgreSQL listen on loopback only and are not exposed.

## Installation and First-Run Flow

Install generates the database password and the app and OAuth keys, then raises a critical task:
solidtime cannot start until **Create Admin Account** has run. That action creates the account
with solidtime's own `admin:user:create --verify-email`, sets a generated password through the
app's own hashing, and makes the email the only super admin.

Upstream's first-run steps the package does instead: generating keys, running migrations (on every
start), creating the account, and creating the personal-access OAuth client that API tokens need.
Sign-up stays off until the user chooses otherwise.

## Actions

None of the actions take long; the ones that change settings restart solidtime, which is back
up in about ten seconds.

- **Create Admin Account** (`create-admin`) — run it at install; a task asks for it, and it is
  hidden once the account exists. It creates the account with the name and email given (the email
  lowercased, as solidtime stores it) and returns a generated password. The package tracks the
  account by its user id from then on. Run while solidtime is stopped, which is the usual case,
  the account is created on the next start.
- **Reset Admin Password** (`reset-admin-password`) — run it when the admin password is lost. It
  takes no input, generates a new random password for the admin account, and returns it with the
  account's current email. While solidtime runs, the password works at once and other sessions of
  that account are signed out; when it is stopped, it is applied on the next start. If the account
  was deleted inside solidtime, it fails with "The admin account no longer exists in solidtime".
- **Set Primary URL** (`set-primary-url`) — run it before inviting anyone. It sets `APP_URL`,
  which solidtime uses only for links built outside a web request: invitation emails and the
  scheduler's reminder emails (both sent by the worker), and the instance URL **Connect Apps**
  shows. Password-reset and email-verification links are built during the request, so they use
  whichever address the person is browsing on.
- **Configure Sign-up** (`set-sign-up`) — **Nobody** (`off`, the default), **Invited people**
  (`invite-only`: a person can sign up
  only with an email whose invitation they already accepted from the emailed link; a pending one
  is refused with "Please accept the organization invitation…"), or **Anyone** (`on`). Invitations
  therefore need SMTP, or the link copied out of the log. Whatever the mode, solidtime's login page
  shows a "Register here!" link and the sign-up form; with sign-up off, submitting it is refused
  with "Registration is disabled."
- **Configure SMTP** (`manage-smtp`) — disabled, the StartOS system SMTP server, or a custom
  server. While disabled, solidtime writes every email it would send to the service log instead.
  solidtime sends password-reset emails while the request waits, so a wrong SMTP setting makes
  **Forgot your password?** fail with a server error; the log then shows
  `Connection could not be established with host "<host>:<port>"` or the server's refusal.
- **Connect Apps** (`connect-apps`) — available while solidtime runs. The first run creates two
  public OAuth clients, `desktop` and `browser-extension`; every later run returns the same client
  IDs. Safe to repeat. Revoking a client inside solidtime makes the next run create a new one.

## Tasks

The package raises one task, at install; until it is done solidtime cannot start.

- **Create the admin account** — raised at install, and whenever `store.json` holds no admin
  password. Critical: solidtime cannot start until **Create Admin Account** has run. It clears
  when that action has run once, and does not return after that.

The admin is the only super admin (`SUPER_ADMINS`). If they change their email inside solidtime,
the next start picks the new address up and restarts solidtime once to apply it.

## Health Checks

Two checks are shown; the database and background daemons report none.

- **Web Interface** — `GET /health-check/up` on port 8000, with a 60-second grace period. A failure
  after start-up means Octane is not answering; the service log shows why (most often the database
  or a migration).
- **PDF Export** — `GET /health` on Gotenberg. A failure means PDF export returns an error; time
  tracking and other exports keep working.

A stuck queue shows as exports and emails that never arrive; the service log shows the worker's
errors.

## Backups and Restore

PostgreSQL is dumped with `pg_dump` and replayed on restore, rather than its files copied; the
`db` volume itself is never captured. The `startos` volume (secrets and settings) and the `storage`
volume (uploaded and generated files) are copied whole. The keys in `store.json` come back with
the dump, so sessions, two-factor secrets and issued API tokens stay valid.

A restored instance needs nothing further: migrations run on its first start. The restore
reinstalls the package, so StartOS may give the interface new ports; a desktop app or browser
extension set up with a `.local` or IP address then needs the new instance URL from **Connect
Apps**.

## Limitations and Differences

What the package leaves out or runs differently from upstream's own deployment.

1. Only local file storage; upstream's S3 settings are not exposed.
2. Horizon, Reverb (live updates between open tabs) and SSR are not run, matching upstream's own
   compose example.
3. The on-premise business extensions are not included.
4. Telemetry and upstream's update check are off; StartOS delivers updates.
5. Logs go to the service log only; nothing is written to `storage/logs`.

---

## Quick Reference for AI Consumers

```yaml
package_id: solidtime
image: solidtime/solidtime
architectures: [x86_64, aarch64]
subcontainers: [postgres, worker, app, gotenberg]
volumes:
  startos: not mounted
  db: /var/lib/postgresql
  storage: /var/www/html/storage
file_models:
  - store.json
startos_managed_env_vars:
  - APP_URL
  - APP_KEY
  - APP_FORCE_HTTPS
  - APP_ENABLE_REGISTRATION
  - TRUSTED_HOSTS
  - TRUSTED_PROXIES
  - SUPER_ADMINS
  - PASSPORT_PRIVATE_KEY
  - PASSPORT_PUBLIC_KEY
  - DB_PASSWORD
  - MAIL_MAILER
  - GOTENBERG_URL
  - SCHEDULING_TASK_SELF_HOSTING_TELEMETRY
  - SCHEDULING_TASK_SELF_HOSTING_CHECK_FOR_UPDATE
dependencies: none
interfaces:
  ui: { type: ui, port: 8000 }
actions:
  - create-admin
  - reset-admin-password
  - set-primary-url
  - set-sign-up
  - manage-smtp
  - connect-apps
tasks:
  - { action: create-admin, severity: critical }
health_checks:
  - app
  - gotenberg
```

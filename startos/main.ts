import { T } from '@start9labs/start-sdk'
import { primaryUrl } from './actions/setPrimaryUrl'
import { storeJson } from './fileModels/store.json'
import { i18n } from './i18n'
import { sdk } from './sdk'
import {
  appRoot,
  applyAdmin,
  baseEnv,
  currentEmail,
  dbMounts,
  ensureClients,
  gotenbergPort,
  httpOk,
  mailEnv,
  personalAccessClient,
  pgIsReady,
  pgdataSubpath,
  postgresDb,
  postgresPath,
  postgresUser,
  readSecrets,
  storageMounts,
  storagePath,
  tolerant,
  uiHostId,
  uiInterfaceId,
  uiPort,
} from './utils'

export const main = sdk.setupMain(async ({ effects }) => {
  console.info(i18n('Starting solidtime'))

  const secrets = await storeJson.read(readSecrets).const(effects)
  if (!secrets) {
    throw new Error(i18n('Generated secrets are missing from store.json'))
  }
  const settings = await storeJson
    .read((s) => ({
      signUp: s.signUp,
      smtp: s.smtp,
      adminEmail: s.adminEmail,
    }))
    .const(effects)
  // Read once: the admin actions apply a password themselves while the database is up.
  const admin = await storeJson
    .read((s) => ({
      id: s.adminUserId,
      name: s.adminName,
      email: s.adminEmail,
      password: s.adminPassword,
      pending: s.adminPending,
    }))
    .once()
  if (!settings || !admin?.name || !admin.email || !admin.password) {
    throw new Error(i18n('No admin account has been set up'))
  }
  const {
    id: adminId,
    name: adminName,
    email: adminEmail,
    password: adminPassword,
  } = admin

  let smtp: T.SmtpValue | null = null
  if (settings.smtp.selection === 'system') {
    smtp = await sdk.getSystemSmtp(effects).const()
    const customFrom = settings.smtp.value.customFrom
    if (smtp && customFrom) smtp = { ...smtp, from: customFrom }
  } else if (settings.smtp.selection === 'custom') {
    const { host, from, username, password, security } =
      settings.smtp.value.provider.value
    smtp = {
      host,
      from,
      username,
      password,
      port: Number(security.value.port),
      security: security.selection,
    }
  }

  // solidtime refuses any request whose Host is not APP_URL's or listed here.
  const trustedHosts = await sdk.host
    .getOwn(effects, uiHostId, (host) => {
      const binding =
        host &&
        Object.values(host.bindings).find((b) => uiInterfaceId in b.interfaces)
      if (!binding) return []
      const hostnames = binding.interfaces[uiInterfaceId].addressInfo
        .format('hostname-info')
        .map((h) =>
          h.metadata.kind === 'ipv6' ? `[${h.hostname}]` : h.hostname,
        )
      return [...new Set(hostnames)].sort()
    })
    .const()

  const env = {
    ...baseEnv(secrets),
    APP_URL:
      (await primaryUrl.bestUsable(effects).const()) ?? 'https://localhost',
    APP_FORCE_HTTPS: 'true',
    // Only StartOS's proxy reaches the container, and it replaces any client-sent X-Forwarded-* header.
    TRUSTED_PROXIES: '0.0.0.0/0,::/0',
    TRUSTED_HOSTS: (trustedHosts ?? []).join(','),
    APP_ENABLE_REGISTRATION: settings.signUp,
    SUPER_ADMINS: settings.adminEmail ?? '',
    ...mailEnv(smtp),
  }

  const postgresSub = sdk.SubContainer.of(
    effects,
    { imageId: 'postgres' },
    dbMounts,
    'postgres',
  )
  const workerSub = sdk.SubContainer.of(
    effects,
    { imageId: 'solidtime' },
    storageMounts,
    'worker',
  )

  return sdk.Daemons.of(effects)
    .addOneshot('pg-recover', {
      subcontainer: postgresSub,
      exec: {
        // After an unclean stop the PID in postmaster.pid is often alive in the new namespace, and postgres refuses to start.
        command: ['rm', '-f', `${postgresPath}${pgdataSubpath}/postmaster.pid`],
        user: 'root',
      },
      requires: [],
    })
    .addDaemon('postgres', {
      subcontainer: postgresSub,
      exec: {
        command: sdk.useEntrypoint(['--listen_addresses=127.0.0.1']),
        env: {
          POSTGRES_USER: postgresUser,
          POSTGRES_DB: postgresDb,
          POSTGRES_PASSWORD: secrets.postgresPassword,
        },
      },
      ready: {
        display: null,
        fn: async () =>
          (await tolerant(() => pgIsReady(postgresSub, 15)))
            ? { result: 'success', message: null }
            : { result: 'starting', message: null },
      },
      requires: ['pg-recover'],
    })
    .addOneshot('storage', {
      subcontainer: workerSub,
      exec: {
        // The volume starts empty, and Laravel needs these directories before it can boot.
        command: [
          'sh',
          '-c',
          `cd ${storagePath} && mkdir -p app/public framework/cache/data framework/sessions framework/views logs && chown -R 1000:1000 .`,
        ],
        user: 'root',
      },
      requires: [],
    })
    .addOneshot('migrate', {
      subcontainer: workerSub,
      exec: {
        command: ['php', 'artisan', 'migrate', '--force'],
        cwd: appRoot,
        env,
      },
      requires: ['postgres', 'storage'],
    })
    .addOneshot('setup', {
      subcontainer: workerSub,
      exec: {
        fn: async (sub) => {
          await ensureClients(sub, env, personalAccessClient)
          if (admin.pending) {
            // Stays pending rather than failing the start; the action reports the error when run while solidtime is up.
            const applied = await applyAdmin(
              sub,
              env,
              adminPassword,
              adminId
                ? { id: adminId }
                : { name: adminName, email: adminEmail },
            ).catch((e) => {
              console.error(e)
              return null
            })
            if (
              applied &&
              (await storeJson.read((s) => s.adminPassword).once()) ===
                adminPassword
            ) {
              await storeJson.merge(effects, {
                adminUserId: applied.id,
                adminEmail: applied.email,
                adminPending: false,
              })
            }
          } else if (adminId) {
            // SUPER_ADMINS follows the admin's email, which they can change inside solidtime.
            const current = await currentEmail(
              postgresSub,
              secrets.postgresPassword,
              adminId,
            )
            if (current && current !== adminEmail) {
              await storeJson.merge(effects, { adminEmail: current })
            }
          }
          return null
        },
      },
      requires: ['migrate'],
    })
    .addDaemon('app', {
      subcontainer: sdk.SubContainer.of(
        effects,
        { imageId: 'solidtime' },
        storageMounts,
        'app',
      ),
      exec: {
        command: [
          'sh',
          '-c',
          `php artisan storage:link; php artisan optimize && exec php artisan octane:frankenphp --host=0.0.0.0 --port=${uiPort} --admin-host=127.0.0.1 --admin-port=2019 --log-level=WARN --caddyfile=${appRoot}/docker/prod/deployment/octane/FrankenPHP/Caddyfile`,
        ],
        cwd: appRoot,
        env: { ...env, LARAVEL_OCTANE: '1' },
      },
      ready: {
        display: i18n('Web Interface'),
        gracePeriod: 60_000,
        fn: async () =>
          (await tolerant(() =>
            httpOk(`http://127.0.0.1:${uiPort}/health-check/up`),
          ))
            ? {
                result: 'success',
                message: i18n('The web interface is ready'),
              }
            : {
                result: 'failure',
                message: i18n('The web interface is not ready'),
              },
      },
      requires: ['setup'],
    })
    .addDaemon('worker', {
      subcontainer: workerSub,
      exec: {
        command: ['php', 'artisan', 'queue:work'],
        cwd: appRoot,
        env,
      },
      ready: {
        display: null,
        fn: () => ({ result: 'success', message: null }),
      },
      requires: ['setup'],
    })
    .addDaemon('scheduler', {
      subcontainer: workerSub,
      exec: {
        command: [
          'sh',
          '-c',
          'php artisan schedule:clear-cache; exec supercronic -overlapping /etc/supercronic/laravel',
        ],
        cwd: appRoot,
        env,
      },
      ready: {
        display: null,
        fn: () => ({ result: 'success', message: null }),
      },
      requires: ['setup'],
    })
    .addDaemon('gotenberg', {
      subcontainer: sdk.SubContainer.of(
        effects,
        { imageId: 'gotenberg' },
        null,
        'gotenberg',
      ),
      exec: {
        command: sdk.useEntrypoint([
          'gotenberg',
          '--api-bind-ip=127.0.0.1',
          `--api-port=${gotenbergPort}`,
        ]),
        runAsInit: true,
      },
      ready: {
        display: i18n('PDF Export'),
        fn: async () =>
          (await tolerant(() =>
            httpOk(`http://127.0.0.1:${gotenbergPort}/health`),
          ))
            ? {
                result: 'success',
                message: i18n('PDF export is ready'),
              }
            : {
                result: 'failure',
                message: i18n('The PDF renderer is not responding'),
              },
      },
      requires: [],
    })
})

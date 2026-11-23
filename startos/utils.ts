import { SubContainer, T, utils } from '@start9labs/start-sdk'
import { i18n } from './i18n'
import { manifest } from './manifest'
import { sdk } from './sdk'

export const uiPort = 8000
export const gotenbergPort = 3000

export const uiHostId = 'main'
export const uiInterfaceId = 'ui'

export const appRoot = '/var/www/html'
export const storagePath = `${appRoot}/storage`

export const postgresPath = '/var/lib/postgresql'
// The postgres 17 image's default PGDATA, relative to postgresPath.
export const pgdataSubpath = '/data'
export const postgresUser = 'solidtime'
export const postgresDb = 'solidtime'

export const getRandomPassword = () =>
  utils.getDefaultString({ charset: 'a-z,A-Z,0-9', len: 32 })

export const dbMounts = sdk.Mounts.of().mountVolume({
  volumeId: 'db',
  subpath: null,
  mountpoint: postgresPath,
  readonly: false,
})

export const storageMounts = sdk.Mounts.of().mountVolume({
  volumeId: 'storage',
  subpath: null,
  mountpoint: storagePath,
  readonly: false,
})

type Sub = SubContainer<typeof manifest>

export type Secrets = {
  postgresPassword: string
  appKey: string
  passportPrivateKey: string
  passportPublicKey: string
}

export const readSecrets = (s: Partial<Secrets>): Secrets | null =>
  s.postgresPassword && s.appKey && s.passportPrivateKey && s.passportPublicKey
    ? {
        postgresPassword: s.postgresPassword,
        appKey: s.appKey,
        passportPrivateKey: s.passportPrivateKey,
        passportPublicKey: s.passportPublicKey,
      }
    : null

export const baseEnv = (s: Secrets) => ({
  APP_NAME: 'solidtime',
  APP_ENV: 'production',
  APP_DEBUG: 'false',
  APP_KEY: s.appKey,
  PASSPORT_PRIVATE_KEY: s.passportPrivateKey,
  PASSPORT_PUBLIC_KEY: s.passportPublicKey,
  LOG_CHANNEL: 'stderr',
  LOG_LEVEL: 'debug',
  DB_CONNECTION: 'pgsql',
  DB_HOST: '127.0.0.1',
  DB_PORT: '5432',
  DB_SSL_MODE: 'disable',
  DB_DATABASE: postgresDb,
  DB_USERNAME: postgresUser,
  DB_PASSWORD: s.postgresPassword,
  QUEUE_CONNECTION: 'database',
  FILESYSTEM_DISK: 'local',
  PUBLIC_FILESYSTEM_DISK: 'public',
  GOTENBERG_URL: `http://127.0.0.1:${gotenbergPort}`,
  SCHEDULING_TASK_SELF_HOSTING_CHECK_FOR_UPDATE: 'false',
  SCHEDULING_TASK_SELF_HOSTING_TELEMETRY: 'false',
})

// solidtime takes a bare address and a separate display name; StartOS gives `Name <address>` or a bare address.
export const splitFrom = (from: string) => {
  const m = from.match(/^\s*"?([^"<]*?)"?\s*<([^>]+)>\s*$/)
  return m
    ? { address: m[2].trim(), name: m[1].trim() || 'solidtime' }
    : { address: from.trim(), name: 'solidtime' }
}

export const mailEnv = (smtp: T.SmtpValue | null): Record<string, string> => {
  if (!smtp) return { MAIL_MAILER: 'log' }
  const from = splitFrom(smtp.from)
  return {
    MAIL_MAILER: 'smtp',
    MAIL_HOST: smtp.host,
    MAIL_PORT: String(smtp.port),
    MAIL_SCHEME: smtp.security === 'tls' ? 'smtps' : 'smtp',
    MAIL_USERNAME: smtp.username ?? '',
    MAIL_PASSWORD: smtp.password ?? '',
    MAIL_FROM_ADDRESS: from.address,
    MAIL_FROM_NAME: from.name,
  }
}

// One failed check stops every dependent (start-technologies#3803), so fail only after three misses in a row.
export const tolerant = async (probe: () => Promise<boolean>) => {
  for (let attempt = 0; attempt < 3; attempt++) {
    if (await probe()) return true
    await new Promise((resolve) => setTimeout(resolve, 2_000))
  }
  return false
}

export const httpOk = (url: string) =>
  fetch(url, { signal: AbortSignal.timeout(10_000) }).then(
    (res) => res.ok,
    () => false,
  )

export const pgIsReady = async (sub: Sub, timeoutSeconds: number) =>
  (
    await sub.exec(
      [
        'pg_isready',
        '-q',
        '-h',
        '127.0.0.1',
        '-U',
        postgresUser,
        '-t',
        String(timeoutSeconds),
      ],
      { timeout: (timeoutSeconds + 5) * 1000 },
    )
  ).exitCode === 0

export async function currentEmail(
  sub: Sub,
  postgresPassword: string,
  userId: string,
) {
  if (!/^[0-9a-f-]{36}$/i.test(userId)) return null
  const res = await sub.exec(
    [
      'psql',
      '-h',
      '127.0.0.1',
      '-U',
      postgresUser,
      '-d',
      postgresDb,
      '-qtAc',
      `select email from users where id = '${userId}'`,
    ],
    { env: { PGPASSWORD: postgresPassword }, timeout: 30_000 },
  )
  return res.exitCode === 0 ? res.stdout.toString().trim() || null : null
}

const php = (code: string) => [
  'php',
  '-r',
  `require '${appRoot}/vendor/autoload.php'; $app = require '${appRoot}/bootstrap/app.php'; $app->make(Illuminate\\Contracts\\Console\\Kernel::class)->bootstrap(); ${code}`,
]

const dbUnavailable = 3
const adminGone = 4
const invalidEmail = 5

const applyAdminScript = `
if (!getenv('ADMIN_USER_ID') && \\Illuminate\\Support\\Facades\\Validator::make(['email' => getenv('ADMIN_EMAIL')], ['email' => ['required', 'email:rfc,strict']])->fails()) exit(${invalidEmail});
try {
  \\Illuminate\\Support\\Facades\\DB::connection()->getPdo();
  if (!\\Illuminate\\Support\\Facades\\Schema::hasTable('users')) exit(${dbUnavailable});
} catch (\\Throwable $e) {
  exit(${dbUnavailable});
}
if ($id = getenv('ADMIN_USER_ID')) {
  $user = \\App\\Models\\User::query()->whereKey($id)->first();
  if (!$user) exit(${adminGone});
} else {
  $email = getenv('ADMIN_EMAIL');
  $find = fn () => \\App\\Models\\User::query()->where('email', $email)->where('is_placeholder', false)->first();
  if (!$find()) {
    $code = \\Illuminate\\Support\\Facades\\Artisan::call('admin:user:create', ['name' => getenv('ADMIN_NAME'), 'email' => $email, '--verify-email' => true]);
    if ($code !== 0) {
      fwrite(STDERR, \\Illuminate\\Support\\Facades\\Artisan::output());
      exit(1);
    }
  }
  $user = $find();
}
$user->forceFill(['password' => \\Illuminate\\Support\\Facades\\Hash::make(getenv('ADMIN_PASSWORD'))]);
if ($user->email_verified_at === null) $user->forceFill(['email_verified_at' => now()]);
$user->save();
echo PHP_EOL, json_encode(['id' => $user->getKey(), 'email' => $user->email]), PHP_EOL;
`

export async function applyAdmin(
  sub: Sub,
  env: Record<string, string>,
  password: string,
  account: { id: string } | { name: string; email: string },
): Promise<{ id: string; email: string } | null> {
  const res = await sub.exec(php(applyAdminScript), {
    cwd: appRoot,
    env: {
      ...env,
      ...('id' in account
        ? { ADMIN_USER_ID: account.id }
        : { ADMIN_NAME: account.name, ADMIN_EMAIL: account.email }),
      ADMIN_PASSWORD: password,
    },
    timeout: 60_000,
  })
  if (res.exitCode === dbUnavailable) return null
  if (res.exitCode === invalidEmail) {
    throw new Error(i18n('solidtime does not accept this email address'))
  }
  if (res.exitCode === adminGone) {
    throw new Error(i18n('The admin account no longer exists in solidtime'))
  }
  if (res.exitCode !== 0) {
    throw new Error(
      `${i18n('solidtime could not set up the admin account:')} ${res.stderr.toString().trim() || res.stdout.toString().trim()}`,
    )
  }
  return JSON.parse(res.stdout.toString().trim().split('\n').pop() ?? '')
}

export const adminLoginResult = (
  email: string,
  password: string,
  applied: boolean,
): Extract<T.ActionResult, { version: '1' }> => ({
  version: '1',
  title: i18n('Admin Login'),
  message: applied
    ? i18n('The password is active. Sign in to solidtime with it.')
    : i18n(
        'solidtime applies this when it next starts. Sign in with it once it is running.',
      ),
  result: {
    type: 'group',
    value: [
      {
        type: 'single',
        name: i18n('Email'),
        description: null,
        value: email,
        masked: false,
        copyable: true,
        qr: false,
        launchable: false,
      },
      {
        type: 'single',
        name: i18n('Password'),
        description: null,
        value: password,
        masked: true,
        copyable: true,
        qr: false,
        launchable: false,
      },
    ],
  },
})

const ensureClientsScript = `
$ids = [];
foreach (json_decode(getenv('CLIENTS'), true) as $name => $options) {
  $find = fn () => \\Laravel\\Passport\\Passport::client()->newQuery()->where('name', $name)->where('revoked', false)->latest()->first();
  if (!$find()) {
    $code = \\Illuminate\\Support\\Facades\\Artisan::call('passport:client', $options + ['--name' => $name, '--no-interaction' => true]);
    if ($code !== 0) {
      fwrite(STDERR, \\Illuminate\\Support\\Facades\\Artisan::output());
      exit(1);
    }
  }
  $client = $find();
  if (!$client) {
    fwrite(STDERR, "passport:client created no client named $name\\n");
    exit(1);
  }
  $ids[$name] = $client->getKey();
}
echo PHP_EOL, json_encode($ids), PHP_EOL;
`

export const personalAccessClient = { API: { '--personal': true } }

export const appClients = {
  desktop: { '--public': true, '--redirect_uri': 'solidtime://oauth/callback' },
  'browser-extension': {
    '--public': true,
    '--redirect_uri':
      'https://3369f72567118d8c03fb34880e9d6378d3b0c569.extensions.allizom.org/,https://hpanifeankiobmgbemnhjmhpjeebdhdd.chromiumapp.org/',
  },
}

export async function ensureClients(
  sub: Sub,
  env: Record<string, string>,
  clients: Record<string, Record<string, string | boolean>>,
): Promise<Record<string, string>> {
  const res = await sub.execFail(php(ensureClientsScript), {
    cwd: appRoot,
    env: { ...env, CLIENTS: JSON.stringify(clients) },
    timeout: 60_000,
  })
  const last = res.stdout.toString().trim().split('\n').pop() ?? ''
  return JSON.parse(last)
}

// `self-host:generate-keys` prints APP_KEY and the Passport keypair as KEY="value" lines, the PEM newlines escaped.
export async function generateKeys(effects: T.Effects) {
  const out = await sdk.SubContainer.withTemp(
    effects,
    { imageId: 'solidtime' },
    sdk.Mounts.of(),
    'generate-keys',
    async (sub) =>
      (
        await sub.execFail(['php', 'artisan', 'self-host:generate-keys'], {
          cwd: appRoot,
          timeout: 120_000,
        })
      ).stdout.toString(),
  )
  const keys = Object.fromEntries(
    [...out.matchAll(/^(\w+)="(.*)"$/gm)].map((m) => [m[1], m[2]]),
  )
  if (
    !keys.APP_KEY ||
    !keys.PASSPORT_PRIVATE_KEY ||
    !keys.PASSPORT_PUBLIC_KEY
  ) {
    throw new Error(i18n('solidtime did not generate its keys'))
  }
  return {
    appKey: keys.APP_KEY,
    passportPrivateKey: keys.PASSPORT_PRIVATE_KEY,
    passportPublicKey: keys.PASSPORT_PUBLIC_KEY,
  }
}

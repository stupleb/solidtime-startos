import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import {
  adminLoginResult,
  applyAdmin,
  baseEnv,
  getRandomPassword,
  readSecrets,
} from '../utils'

export const resetAdminPassword = sdk.Action.withoutInput(
  'reset-admin-password',

  async ({ effects }) => ({
    name: i18n('Reset Admin Password'),
    description: i18n(
      'Give the admin account a new random password and show it.',
    ),
    warning: i18n('Replaces the admin password.'),
    allowedStatuses: 'any',
    group: null,
    visibility: (await storeJson.read((s) => s.adminPassword).const(effects))
      ? 'enabled'
      : 'hidden',
  }),

  async ({ effects }) => {
    const store = await storeJson.read().once()
    const secrets = store && readSecrets(store)
    if (!secrets || !store.adminEmail || !store.adminName) {
      throw new Error(i18n('The package has not finished installing'))
    }
    const password = getRandomPassword()
    // Until the account first reaches the database there is no id yet, only the email it will be created with.
    const account = store.adminUserId
      ? { id: store.adminUserId }
      : { name: store.adminName, email: store.adminEmail }

    const admin = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'solidtime' },
      sdk.Mounts.of(),
      'reset-admin-password',
      (sub) => applyAdmin(sub, baseEnv(secrets), password, account),
    )

    await storeJson.merge(effects, {
      ...(admin && { adminUserId: admin.id, adminEmail: admin.email }),
      adminPassword: password,
      adminPending: !admin,
    })

    return adminLoginResult(admin?.email ?? store.adminEmail, password, !!admin)
  },
)

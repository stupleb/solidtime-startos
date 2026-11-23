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

const inputSpec = sdk.InputSpec.of({
  name: sdk.Value.text({
    name: i18n('Name'),
    description: i18n('The name shown for the admin in solidtime'),
    required: true,
    default: null,
    maxLength: 255,
  }),
  email: sdk.Value.text({
    name: i18n('Email'),
    description: i18n(
      'The email address the admin signs in with. It does not need to receive mail.',
    ),
    required: true,
    default: null,
    maxLength: 255,
    patterns: [
      {
        regex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+$',
        description: i18n('Must be an email address'),
      },
    ],
  }),
})

export const createAdmin = sdk.Action.withInput(
  'create-admin',

  async ({ effects }) => ({
    name: i18n('Create Admin Account'),
    description: i18n(
      'Create the admin account and show its password. The admin can open the super admin panel at /admin.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: (await storeJson.read((s) => s.adminPassword).const(effects))
      ? 'hidden'
      : 'enabled',
  }),

  inputSpec,

  async () => ({}),

  async ({ effects, input }) => {
    const secrets = await storeJson.read(readSecrets).once()
    if (!secrets) {
      throw new Error(i18n('The package has not finished installing'))
    }
    // solidtime stores emails lowercased; SUPER_ADMINS and the account lookup must match it.
    const email = input.email.trim().toLowerCase()
    const password = getRandomPassword()

    const admin = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'solidtime' },
      sdk.Mounts.of(),
      'create-admin',
      (sub) =>
        applyAdmin(sub, baseEnv(secrets), password, {
          name: input.name.trim(),
          email,
        }),
    )

    await storeJson.merge(effects, {
      adminUserId: admin?.id,
      adminName: input.name.trim(),
      adminEmail: email,
      adminPassword: password,
      adminPending: !admin,
    })

    return adminLoginResult(email, password, !!admin)
  },
)

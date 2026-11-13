import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

const inputSpec = sdk.InputSpec.of({
  mode: sdk.Value.select({
    name: i18n('Who can sign up'),
    description: i18n(
      'Invited people sign up with the email their organization invitation went to, after opening its link.',
    ),
    default: 'off',
    values: {
      off: i18n('Nobody'),
      'invite-only': i18n('Invited people'),
      on: i18n('Anyone'),
    },
  }),
})

export const setSignUp = sdk.Action.withInput(
  'set-sign-up',

  async ({ effects }) => ({
    name: i18n('Configure Sign-up'),
    description: i18n(
      'Choose who can create their own solidtime account. The admin account always exists, whatever you choose. solidtime restarts to apply it.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  }),

  inputSpec,

  async ({ effects }) => ({
    mode: (await storeJson.read((s) => s.signUp).const(effects)) ?? undefined,
  }),

  async ({ effects, input }) =>
    storeJson.merge(effects, { signUp: input.mode }),
)

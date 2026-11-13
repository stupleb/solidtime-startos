import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { appClients, baseEnv, ensureClients, readSecrets } from '../utils'
import { primaryUrl } from './setPrimaryUrl'

export const connectApps = sdk.Action.withoutInput(
  'connect-apps',

  async () => ({
    name: i18n('Connect Apps'),
    description: i18n(
      'Show the instance URL and client IDs the solidtime desktop app and browser extensions sign in with. The first run creates their sign-in clients; later runs show the same IDs.',
    ),
    warning: null,
    allowedStatuses: 'only-running',
    group: null,
    visibility: 'enabled',
  }),

  async ({ effects }) => {
    const secrets = await storeJson.read(readSecrets).once()
    if (!secrets) {
      throw new Error(i18n('The package has not finished installing'))
    }
    const ids = await sdk.SubContainer.withTemp(
      effects,
      { imageId: 'solidtime' },
      sdk.Mounts.of(),
      'connect-apps',
      (sub) => ensureClients(sub, baseEnv(secrets), appClients),
    )
    const url = await primaryUrl.bestUsable(effects).once()

    return {
      version: '1',
      title: i18n('Connect Apps'),
      message: i18n(
        'In the desktop app, open Instance Settings and enter the instance URL and the desktop client ID. In a browser extension, open its instance settings and enter the instance URL and the browser extension client ID.',
      ),
      result: {
        type: 'group',
        value: [
          {
            type: 'single',
            name: i18n('Instance URL'),
            description: null,
            value: url ?? '',
            masked: false,
            copyable: true,
            qr: false,
            launchable: false,
          },
          {
            type: 'single',
            name: i18n('Desktop app client ID'),
            description: null,
            value: ids.desktop,
            masked: false,
            copyable: true,
            qr: false,
            launchable: false,
          },
          {
            type: 'single',
            name: i18n('Browser extension client ID'),
            description: null,
            value: ids['browser-extension'],
            masked: false,
            copyable: true,
            qr: false,
            launchable: false,
          },
        ],
      },
    }
  },
)

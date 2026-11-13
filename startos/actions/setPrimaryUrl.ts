import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'
import { uiHostId, uiInterfaceId } from '../utils'

export const primaryUrl = sdk.setupPrimaryUrl({
  id: 'set-primary-url',
  hostId: uiHostId,
  interfaceId: uiInterfaceId,
  metadata: {
    name: i18n('Set Primary URL'),
    description: i18n(
      'Choose the address solidtime puts in invitation emails and other emails it sends in the background, and the instance URL Connect Apps shows. A running solidtime restarts to apply it.',
    ),
    warning: null,
    allowedStatuses: 'any',
    group: null,
    visibility: 'enabled',
  },
  field: {
    name: i18n('Primary URL'),
    description: i18n(
      'Pick an address everyone you invite can reach. Until you pick one, solidtime uses a public domain if this interface has one, otherwise its .local address.',
    ),
  },
  get: storeJson.read((s) => s.primaryUrl),
  set: (effects, url) => storeJson.merge(effects, { primaryUrl: url }),
  ssl: true,
})

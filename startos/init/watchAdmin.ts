import { createAdmin } from '../actions/createAdmin'
import { storeJson } from '../fileModels/store.json'
import { i18n } from '../i18n'
import { sdk } from '../sdk'

export const watchAdmin = sdk.setupOnInit(async (effects) => {
  const password = await storeJson.read((s) => s.adminPassword).const(effects)
  if (!password) {
    await sdk.action.createOwnTask(effects, createAdmin, 'critical', {
      reason: i18n('Create the admin account before starting solidtime'),
    })
  }
})

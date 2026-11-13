import { storeJson } from '../fileModels/store.json'
import { sdk } from '../sdk'
import { generateKeys, getRandomPassword } from '../utils'

export const seedFiles = sdk.setupOnInit(async (effects, kind) => {
  if (kind !== 'install') {
    await storeJson.merge(effects, {})
    return
  }

  await storeJson.merge(effects, {
    postgresPassword: getRandomPassword(),
    ...(await generateKeys(effects)),
  })
})

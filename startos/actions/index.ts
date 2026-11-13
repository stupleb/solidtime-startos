import { sdk } from '../sdk'
import { connectApps } from './connectApps'
import { createAdmin } from './createAdmin'
import { manageSmtp } from './manageSmtp'
import { resetAdminPassword } from './resetAdminPassword'
import { primaryUrl } from './setPrimaryUrl'
import { setSignUp } from './setSignUp'

export const actions = sdk.Actions.of()
  .addAction(createAdmin)
  .addAction(resetAdminPassword)
  .addAction(primaryUrl.action)
  .addAction(setSignUp)
  .addAction(manageSmtp)
  .addAction(connectApps)

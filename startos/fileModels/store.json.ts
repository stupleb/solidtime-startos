import { FileHelper, smtpShape, z } from '@start9labs/start-sdk'
import { sdk } from '../sdk'

const shape = z.looseObject({
  postgresPassword: z.string().optional().catch(undefined),
  appKey: z.string().optional().catch(undefined),
  passportPrivateKey: z.string().optional().catch(undefined),
  passportPublicKey: z.string().optional().catch(undefined),
  primaryUrl: z.string().catch(''),
  signUp: z.enum(['off', 'invite-only', 'on']).catch('off'),
  smtp: smtpShape,
  adminUserId: z.string().optional().catch(undefined),
  adminName: z.string().optional().catch(undefined),
  adminEmail: z.string().optional().catch(undefined),
  adminPassword: z.string().optional().catch(undefined),
  // Set when the admin account could not reach the database; the next start applies it.
  adminPending: z.boolean().catch(false),
})

export const storeJson = FileHelper.json(
  { base: sdk.volumes.startos, subpath: './store.json' },
  shape,
)

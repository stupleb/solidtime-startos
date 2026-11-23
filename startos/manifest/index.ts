import { setupManifest } from '@start9labs/start-sdk'
import { long, short } from './i18n'

export const manifest = setupManifest({
  id: 'solidtime',
  title: 'solidtime',
  license: 'AGPL-3.0',
  packageRepo: 'https://github.com/stupleb/solidtime-startos',
  upstreamRepo: 'https://github.com/solidtime-io/solidtime',
  marketingUrl: 'https://www.solidtime.io',
  donationUrl: 'https://github.com/sponsors/solidtime-io',
  description: { short, long },
  volumes: ['startos', 'db', 'storage'],
  images: {
    solidtime: {
      source: { dockerTag: 'solidtime/solidtime:0.23.0' },
      arch: ['x86_64', 'aarch64'],
    },
    postgres: {
      source: { dockerTag: 'postgres:17.12-alpine' },
      arch: ['x86_64', 'aarch64'],
    },
    gotenberg: {
      source: { dockerTag: 'gotenberg/gotenberg:8.40.0-chromium' },
      arch: ['x86_64', 'aarch64'],
    },
  },
})

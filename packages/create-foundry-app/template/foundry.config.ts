import { defineConfig } from '@foundrydb/runtime'

export default defineConfig({
  project: '{{PROJECT_NAME}}',
  resources: {
    db: {
      type: 'postgres',
      plan: 'tier-2',
      version: '17',
      extensions: ['pgvector'],
      storageGB: 50,
    },
    store: {
      type: 'files',
      quotaGB: 50,
    },
    auth: {
      type: 'auth',
      providers: ['google', 'github'],
    },
    web: {
      type: 'app',
      port: 3000,
      attach: ['db', 'store'],
      auth: 'auth',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
})

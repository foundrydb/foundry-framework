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
      // Build and push your app image, then set it here (e.g. with GitHub
      // Actions or `docker build && docker push`). Buildpacks are out of scope
      // in Phase 1, so the framework wires this prebuilt image rather than
      // building from source. The platform injects DATABASE_URL, S3_*,
      // AUTHD_ISSUER_URL and FOUNDRY_API_* into the container at runtime.
      image: 'ghcr.io/{{PROJECT_NAME}}/web:latest',
      port: 3000,
      attach: ['db', 'store'],
      auth: 'auth',
      env: {
        NODE_ENV: 'production',
      },
    },
  },
})

# foundry-framework

One command ships your app with a Postgres database, object storage, and auth to the FoundryDB platform.

```bash
npx create-foundry-app my-app
cd my-app
foundry dev    # local emulators: Postgres + MinIO + auth stub
foundry deploy # production: FoundryDB managed services
```

## How it works

Define your infrastructure in `foundry.config.ts` alongside your application code:

```typescript
import { defineConfig } from '@foundrydb/runtime'

export default defineConfig({
  project: 'my-app',
  resources: {
    db: { type: 'postgres', plan: 'tier-2', version: '17', extensions: ['pgvector'] },
    store: { type: 'files', quotaGB: 50 },
    auth: { type: 'auth', providers: ['google', 'github'] },
    web: { type: 'app', port: 3000, attach: ['db', 'store'], auth: 'auth', env: { NODE_ENV: 'production' } },
  },
})
```

The `foundry deploy` command reads this config, builds a platform descriptor, and provisions everything atomically on FoundryDB. You get back a live URL.

## Portability and no lock-in

The platform injects standard environment variables into your app container:

| Resource | Variable(s) |
|----------|-------------|
| Postgres | `DATABASE_URL` (standard connection string) |
| Files | `S3_ENDPOINT`, `S3_BUCKET`, `S3_ACCESS_KEY`, `S3_SECRET` (S3-compatible) |
| Auth | `AUTHD_ISSUER_URL` (standard OIDC issuer) |

Your app reads these through `@foundrydb/runtime` accessors or directly from `process.env`. The values are standard open protocols:

- **Database**: any Postgres-compatible server works (RDS, Neon, local Postgres, Babelfish)
- **Files**: any S3-compatible store works (AWS S3, MinIO, Tigris, Cloudflare R2)
- **Auth**: any OIDC-compliant identity provider works (Auth0, Keycloak, Cognito)

`foundry dev` starts the same contracts locally with Docker so there is no environment gap between development and production.

## Self-hosted

Point the CLI at your own FoundryDB instance:

```bash
foundry login --api-url https://api.my-foundrydb.example.com
# or per-command:
foundry deploy --api-url https://api.my-foundrydb.example.com
```

Or set `FOUNDRY_API_URL` in the environment.

## Packages

| Package | Purpose |
|---------|---------|
| [`@foundrydb/runtime`](packages/runtime) | Typed config + runtime env accessors |
| [`foundry`](packages/cli) | CLI: deploy, dev, login, migrate |
| [`create-foundry-app`](packages/create-foundry-app) | Project scaffolder |

## Quick reference

```bash
# Scaffold a new project
npx create-foundry-app <name>

# Local development (Docker required)
foundry dev

# Apply SQL migrations
foundry migrate

# Deploy to FoundryDB
foundry deploy [--env production] [--api-url <url>]

# Authenticate
foundry login [--api-url <url>]
```

## License

MIT. Copyright (c) 2024 Anorph.

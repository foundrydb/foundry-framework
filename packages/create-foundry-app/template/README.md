# {{PROJECT_NAME}}

A Next.js app scaffolded with [create-foundry-app](https://foundrydb.com).

## Getting started

```bash
# Start local emulators (Postgres + MinIO) and run the dev server
npx foundry dev

# Apply database migrations
npx foundry migrate

# Deploy to production
npx foundry deploy
```

## Project structure

```
app/                     Next.js App Router pages
  page.tsx               Home page (shows resource status)
  layout.tsx             Root layout
  api/
    health/route.ts      Health check (tests Postgres connectivity)
migrations/              SQL migration files (applied by `foundry migrate`)
foundry.config.ts        FoundryDB resource configuration
.env.example             Environment variable reference
```

## Environment variables

These are injected automatically by `foundry dev` (local) or the FoundryDB platform (production).
See `.env.example` for reference values.

| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | Postgres connection string |
| `S3_ENDPOINT` | S3-compatible storage endpoint |
| `S3_BUCKET` | Storage bucket name |
| `S3_ACCESS_KEY` | Storage access key |
| `S3_SECRET` | Storage secret key |
| `AUTHD_ISSUER_URL` | OIDC issuer URL |
| `FOUNDRY_ENV` | `development` in local dev |

## Resources

This app provisions: Postgres (with pgvector), object storage, auth (Google + GitHub), and a web app container.
Edit `foundry.config.ts` to change plans, add extensions, or adjust the resource topology.

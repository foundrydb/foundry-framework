/**
 * foundry dev: start local emulators (Postgres + MinIO) via Docker,
 * set env vars, then spawn the project's `npm run dev` process.
 * Tears containers down on SIGINT/SIGTERM.
 */
import { Command } from 'commander'
import { spawnSync, spawn, ChildProcess } from 'child_process'
import { loadFoundryConfig } from '../load-foundry-config.js'

const POSTGRES_CONTAINER = 'foundry-dev-postgres'
const MINIO_CONTAINER = 'foundry-dev-minio'
const DEV_BUCKET = 'foundry-dev'
const MINIO_ROOT_USER = 'foundrydev'
const MINIO_ROOT_PASSWORD = 'foundrydev123'
const POSTGRES_PASSWORD = 'foundrydev'
const POSTGRES_DB = 'foundrydev'
const POSTGRES_USER = 'foundrydev'
const POSTGRES_PORT = '15432'
const MINIO_API_PORT = '19000'
const MINIO_CONSOLE_PORT = '19001'

function dockerAvailable(): boolean {
  const result = spawnSync('docker', ['info'], { stdio: 'ignore' })
  return result.status === 0
}

function containerRunning(name: string): boolean {
  const result = spawnSync('docker', ['inspect', '--format', '{{.State.Running}}', name], {
    stdio: 'pipe',
    encoding: 'utf8',
  })
  return result.status === 0 && result.stdout?.trim() === 'true'
}

function run(cmd: string, args: string[]): void {
  const result = spawnSync(cmd, args, { stdio: 'inherit' })
  if (result.status !== 0) {
    throw new Error(`Command failed: ${cmd} ${args.join(' ')}`)
  }
}

function stopContainer(name: string): void {
  spawnSync('docker', ['rm', '-f', name], { stdio: 'ignore' })
}

export function registerDev(program: Command): void {
  program
    .command('dev')
    .description('Start local emulators (Postgres + MinIO) and run your app in development mode')
    .action(async () => {
      if (!dockerAvailable()) {
        console.error(
          'Docker is not available or not running.\n' +
            'Install Docker Desktop from https://www.docker.com/products/docker-desktop/ and try again.',
        )
        process.exit(1)
      }

      // Load config to know which resources exist (optional: could also just start all emulators)
      let config
      try {
        config = await loadFoundryConfig(process.cwd())
      } catch (err) {
        console.error((err as Error).message)
        process.exit(1)
      }

      const resources = Object.values(config.resources)
      const hasPostgres = resources.some((r) => r.type === 'postgres')
      const hasFiles = resources.some((r) => r.type === 'files')

      console.log(`Starting local dev emulators for project: ${config.project}`)

      if (hasPostgres) {
        if (!containerRunning(POSTGRES_CONTAINER)) {
          console.log('Starting Postgres container...')
          run('docker', [
            'run', '-d',
            '--name', POSTGRES_CONTAINER,
            '-e', `POSTGRES_USER=${POSTGRES_USER}`,
            '-e', `POSTGRES_PASSWORD=${POSTGRES_PASSWORD}`,
            '-e', `POSTGRES_DB=${POSTGRES_DB}`,
            '-p', `${POSTGRES_PORT}:5432`,
            'postgres:17',
          ])
          // Wait for Postgres to be ready
          console.log('Waiting for Postgres to be ready...')
          for (let i = 0; i < 20; i++) {
            await new Promise((r) => setTimeout(r, 1000))
            const check = spawnSync(
              'docker',
              ['exec', POSTGRES_CONTAINER, 'pg_isready', '-U', POSTGRES_USER],
              { stdio: 'ignore' },
            )
            if (check.status === 0) break
            if (i === 19) {
              console.error('Postgres did not become ready in time.')
              process.exit(1)
            }
          }
          console.log(`Postgres ready on port ${POSTGRES_PORT}`)
        } else {
          console.log(`Postgres container already running on port ${POSTGRES_PORT}`)
        }
      }

      if (hasFiles) {
        if (!containerRunning(MINIO_CONTAINER)) {
          console.log('Starting MinIO container...')
          run('docker', [
            'run', '-d',
            '--name', MINIO_CONTAINER,
            '-e', `MINIO_ROOT_USER=${MINIO_ROOT_USER}`,
            '-e', `MINIO_ROOT_PASSWORD=${MINIO_ROOT_PASSWORD}`,
            '-p', `${MINIO_API_PORT}:9000`,
            '-p', `${MINIO_CONSOLE_PORT}:9001`,
            'minio/minio',
            'server', '/data', '--console-address', ':9001',
          ])
          // Wait for MinIO to be ready
          console.log('Waiting for MinIO to be ready...')
          for (let i = 0; i < 20; i++) {
            await new Promise((r) => setTimeout(r, 1000))
            try {
              const resp = await fetch(`http://localhost:${MINIO_API_PORT}/minio/health/live`)
              if (resp.ok) break
            } catch { /* not ready yet */ }
            if (i === 19) {
              console.error('MinIO did not become ready in time.')
              process.exit(1)
            }
          }
          console.log(`MinIO ready on port ${MINIO_API_PORT} (console: ${MINIO_CONSOLE_PORT})`)

          // Create the dev bucket via mc (minio client) inside the container
          console.log(`Creating bucket: ${DEV_BUCKET}`)
          spawnSync('docker', [
            'exec', MINIO_CONTAINER,
            'sh', '-c',
            `mc alias set local http://localhost:9000 ${MINIO_ROOT_USER} ${MINIO_ROOT_PASSWORD} && mc mb --ignore-existing local/${DEV_BUCKET}`,
          ], { stdio: 'inherit' })
        } else {
          console.log(`MinIO container already running on port ${MINIO_API_PORT}`)
        }
      }

      // Build the injected environment
      const devEnv: Record<string, string> = {
        ...process.env as Record<string, string>,
        FOUNDRY_ENV: 'development',
        AUTHD_ISSUER_URL: 'http://localhost:14000',
      }
      if (hasPostgres) {
        devEnv['DATABASE_URL'] =
          `postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@localhost:${POSTGRES_PORT}/${POSTGRES_DB}`
      }
      if (hasFiles) {
        devEnv['S3_ENDPOINT'] = `http://localhost:${MINIO_API_PORT}`
        devEnv['S3_BUCKET'] = DEV_BUCKET
        devEnv['S3_ACCESS_KEY'] = MINIO_ROOT_USER
        devEnv['S3_SECRET'] = MINIO_ROOT_PASSWORD
      }

      console.log('\nEnvironment:')
      if (hasPostgres) console.log(`  DATABASE_URL=${devEnv['DATABASE_URL']}`)
      if (hasFiles) {
        console.log(`  S3_ENDPOINT=${devEnv['S3_ENDPOINT']}`)
        console.log(`  S3_BUCKET=${devEnv['S3_BUCKET']}`)
      }
      console.log(`  FOUNDRY_ENV=development`)
      console.log()

      // Spawn npm run dev with the enriched environment
      console.log('Starting app (npm run dev)...')
      const devProcess: ChildProcess = spawn('npm', ['run', 'dev'], {
        cwd: process.cwd(),
        env: devEnv,
        stdio: 'inherit',
        shell: false,
      })

      const cleanup = (): void => {
        console.log('\nShutting down...')
        devProcess.kill('SIGTERM')
        if (hasPostgres) {
          console.log('Stopping Postgres container...')
          stopContainer(POSTGRES_CONTAINER)
        }
        if (hasFiles) {
          console.log('Stopping MinIO container...')
          stopContainer(MINIO_CONTAINER)
        }
        process.exit(0)
      }

      process.on('SIGINT', cleanup)
      process.on('SIGTERM', cleanup)

      devProcess.on('exit', (code) => {
        cleanup()
        process.exit(code ?? 0)
      })
    })
}

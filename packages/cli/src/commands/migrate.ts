/**
 * foundry migrate: apply ordered .sql files from a migrations directory
 * against DATABASE_URL, tracking applied files in _foundry_migrations.
 */
import { Command } from 'commander'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join, resolve } from 'path'

const MIGRATIONS_TABLE = '_foundry_migrations'

interface MigrationRow extends Record<string, unknown> {
  filename: string
  applied_at: Date
}

export function registerMigrate(program: Command): void {
  program
    .command('migrate')
    .description('Apply pending SQL migrations from the migrations directory to DATABASE_URL')
    .option('--dir <path>', 'Directory containing .sql migration files', 'migrations')
    .action(async (opts: { dir: string }) => {
      const databaseUrl = process.env['DATABASE_URL']
      if (!databaseUrl) {
        console.error(
          'DATABASE_URL is not set. Run `foundry dev` to start local emulators, or set it manually.',
        )
        process.exit(1)
      }

      const migrationsDir = resolve(process.cwd(), opts.dir)
      if (!existsSync(migrationsDir)) {
        console.error(`Migrations directory not found: ${migrationsDir}`)
        process.exit(1)
      }

      // Load pg lazily so it remains an optional dep of the CLI.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let pgModule: any
      try {
        pgModule = await import('pg')
      } catch {
        console.error('The `pg` package is required for migrations. Install it with: npm install pg')
        process.exit(1)
      }

      const PgClient = pgModule.Client ?? pgModule.default?.Client
      const client: {
        connect(): Promise<unknown>
        query(sql: string, values?: unknown[]): Promise<{ rows: Array<Record<string, unknown>> }>
        end(): Promise<void>
      } = new PgClient({ connectionString: databaseUrl })
      await client.connect()

      try {
        // Ensure migrations table exists
        await client.query(`
          CREATE TABLE IF NOT EXISTS ${MIGRATIONS_TABLE} (
            filename TEXT PRIMARY KEY,
            applied_at TIMESTAMPTZ NOT NULL DEFAULT now()
          )
        `)

        // Load applied migrations
        const { rows: appliedRows } = await client.query(
          `SELECT filename FROM ${MIGRATIONS_TABLE} ORDER BY filename`,
        )
        const applied = appliedRows as MigrationRow[]
        const appliedSet = new Set(applied.map((r) => r.filename))

        // Find all .sql files, sorted alphabetically (timestamp prefix ensures order)
        const allFiles = readdirSync(migrationsDir)
          .filter((f) => f.endsWith('.sql'))
          .sort()

        const pending = allFiles.filter((f) => !appliedSet.has(f))

        if (pending.length === 0) {
          console.log('No pending migrations.')
          return
        }

        console.log(`Applying ${pending.length} migration(s)...`)

        for (const filename of pending) {
          const filepath = join(migrationsDir, filename)
          const sql = readFileSync(filepath, 'utf8')
          console.log(`  Applying: ${filename}`)
          await client.query('BEGIN')
          try {
            await client.query(sql)
            await client.query(
              `INSERT INTO ${MIGRATIONS_TABLE} (filename) VALUES ($1)`,
              [filename],
            )
            await client.query('COMMIT')
            console.log(`  Applied:  ${filename}`)
          } catch (err) {
            await client.query('ROLLBACK')
            console.error(`  Failed:   ${filename}`)
            console.error(`  Error:    ${(err as Error).message}`)
            process.exit(1)
          }
        }

        console.log(`\nMigrations complete. ${pending.length} applied.`)
      } finally {
        await client.end()
      }
    })
}

/**
 * Database runtime accessor.
 *
 * Reads DATABASE_URL injected by the FoundryDB platform (or foundry dev).
 * The pg Pool is loaded lazily so this module has no hard native dependency.
 */

let _pool: unknown = null

function requireDatabaseUrl(): string {
  const url = process.env['DATABASE_URL']
  if (!url) {
    throw new Error(
      '[foundrydb/runtime] DATABASE_URL is not set. ' +
        'Run `foundry dev` locally or deploy with `foundry deploy` to have this injected automatically.',
    )
  }
  return url
}

export const db = {
  /** Returns the raw DATABASE_URL string. */
  url(): string {
    return requireDatabaseUrl()
  },

  /**
   * Returns a lazy pg.Pool connected to DATABASE_URL.
   * Requires `pg` to be installed in your project (optional peer dependency).
   */
  async connect(): Promise<unknown> {
    if (_pool) return _pool
    const databaseUrl = requireDatabaseUrl()
    // Dynamic import so pg is an optional peer dep and never bundled into this module.
    // We avoid a typed import to keep this module free of that dependency at compile time.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let pg: any
    try {
      pg = await import('pg')
    } catch {
      throw new Error(
        '[foundrydb/runtime] The `pg` package is required to use db.connect(). ' +
          'Install it with: npm install pg',
      )
    }
    // pg may export as default (ESM) or direct (CJS)
    const Pool = pg.Pool ?? pg.default?.Pool
    _pool = new Pool({ connectionString: databaseUrl })
    return _pool
  },
}

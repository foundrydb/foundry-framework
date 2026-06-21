/**
 * Object storage runtime accessor.
 *
 * Reads S3_* variables injected by the FoundryDB platform (or foundry dev with MinIO).
 * The S3 client is loaded lazily so @aws-sdk/client-s3 is an optional peer dep.
 */

export interface FilesConfig {
  endpoint: string
  bucket: string
  accessKey: string
  secret: string
}

function requireFilesConfig(): FilesConfig {
  // Support both plain and prefixed variable names.
  const endpoint =
    process.env['S3_ENDPOINT'] ?? process.env['FOUNDRY_S3_ENDPOINT']
  const bucket =
    process.env['S3_BUCKET'] ?? process.env['FOUNDRY_S3_BUCKET']
  const accessKey =
    process.env['S3_ACCESS_KEY'] ?? process.env['FOUNDRY_S3_ACCESS_KEY']
  const secret =
    process.env['S3_SECRET'] ?? process.env['FOUNDRY_S3_SECRET']

  const missing: string[] = []
  if (!endpoint) missing.push('S3_ENDPOINT')
  if (!bucket) missing.push('S3_BUCKET')
  if (!accessKey) missing.push('S3_ACCESS_KEY')
  if (!secret) missing.push('S3_SECRET')

  if (missing.length > 0) {
    throw new Error(
      `[foundrydb/runtime] Missing object storage environment variables: ${missing.join(', ')}. ` +
        'Run `foundry dev` locally or deploy with `foundry deploy` to have these injected automatically.',
    )
  }

  return { endpoint: endpoint!, bucket: bucket!, accessKey: accessKey!, secret: secret! }
}

let _s3Client: unknown = null

export const files = {
  /** Returns the resolved S3-compatible config object. */
  config(): FilesConfig {
    return requireFilesConfig()
  },

  /**
   * Returns a lazy @aws-sdk/client-s3 S3Client connected to the platform storage.
   * Requires `@aws-sdk/client-s3` to be installed in your project (optional peer dep).
   */
  async client(): Promise<unknown> {
    if (_s3Client) return _s3Client
    const cfg = requireFilesConfig()

    // Dynamic import so @aws-sdk/client-s3 is an optional peer dep.
    // We avoid a typed import to keep this module free of that dependency at compile time.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let s3Module: any
    try {
      // The string is split to prevent TypeScript from trying to resolve the module during compilation.
      const pkg = '@aws-sdk/' + 'client-s3'
      s3Module = await import(pkg)
    } catch {
      throw new Error(
        '[foundrydb/runtime] The `@aws-sdk/client-s3` package is required to use files.client(). ' +
          'Install it with: npm install @aws-sdk/client-s3',
      )
    }
    _s3Client = new s3Module.S3Client({
      endpoint: cfg.endpoint,
      region: 'auto',
      credentials: {
        accessKeyId: cfg.accessKey,
        secretAccessKey: cfg.secret,
      },
      forcePathStyle: true,
    })
    return _s3Client
  },
}

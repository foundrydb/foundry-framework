/**
 * Auth runtime accessor.
 *
 * Reads AUTHD_ISSUER_URL and platform token variables injected by FoundryDB.
 */

function requireIssuerUrl(): string {
  const url = process.env['AUTHD_ISSUER_URL']
  if (!url) {
    throw new Error(
      '[foundrydb/runtime] AUTHD_ISSUER_URL is not set. ' +
        'Run `foundry dev` locally or deploy with `foundry deploy` to have this injected automatically.',
    )
  }
  return url
}

export const auth = {
  /** Returns the OIDC issuer URL for verifying tokens. */
  issuerUrl(): string {
    return requireIssuerUrl()
  },

  /**
   * Returns the platform API token (FOUNDRY_API_TOKEN).
   * Use this to call FoundryDB management APIs from inside your app (e.g. to provision sub-resources).
   */
  platformToken(): string {
    const token = process.env['FOUNDRY_API_TOKEN']
    if (!token) {
      throw new Error(
        '[foundrydb/runtime] FOUNDRY_API_TOKEN is not set. ' +
          'This is injected automatically when your app is deployed via `foundry deploy`.',
      )
    }
    return token
  },

  /** Returns the FoundryDB API base URL (FOUNDRY_API_URL). Defaults to https://api.foundrydb.com. */
  apiUrl(): string {
    return process.env['FOUNDRY_API_URL'] ?? 'https://api.foundrydb.com'
  },
}

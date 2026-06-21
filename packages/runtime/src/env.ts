/**
 * Environment detection helpers.
 */

/**
 * Returns true when the app is running in local development mode
 * (i.e. FOUNDRY_ENV === 'development', set by `foundry dev`).
 */
export function isLocalDev(): boolean {
  return process.env['FOUNDRY_ENV'] === 'development'
}

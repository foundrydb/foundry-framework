/**
 * Resource type definitions for foundry.config.ts
 */

export interface PostgresResource {
  type: 'postgres'
  /** Compute plan name (e.g. 'tier-2'). Defaults to 'tier-2'. */
  plan?: string
  /** Database major version (e.g. '17'). Defaults to '17'. */
  version?: string
  /** Postgres extensions to install (e.g. ['pgvector', 'postgis']). */
  extensions?: string[]
  /** Data storage in GB. Defaults to 50. */
  storageGB?: number
}

export interface FilesResource {
  type: 'files'
  /** Storage quota in GB. Defaults to 50. */
  quotaGB?: number
}

export interface AuthResource {
  type: 'auth'
  /** OAuth providers to enable (e.g. ['google', 'github']). */
  providers?: string[]
}

export interface AppResource {
  type: 'app'
  /**
   * The prebuilt container image to run, e.g. "ghcr.io/you/app:tag". Build and
   * push your app image yourself (buildpacks are out of scope in Phase 1); the
   * framework wires the platform-injected env (DATABASE_URL, S3_*,
   * AUTHD_ISSUER_URL, FOUNDRY_API_*) into it.
   */
  image: string
  /** Port your app listens on. */
  port: number
  /** Logical names of resources to attach (db, files, etc.). */
  attach?: string[]
  /** Logical name of the auth resource to wire. */
  auth?: string
  /** Extra environment variables injected into the container. */
  env?: Record<string, string>
}

export type AnyResource = PostgresResource | FilesResource | AuthResource | AppResource

export interface FoundryConfig {
  /** Your project name. Used as the deployment identifier. */
  project: string
  /** Named resources that make up your project. */
  resources: Record<string, AnyResource>
}

/**
 * Identity helper with full TypeScript inference for foundry.config.ts.
 *
 * Usage:
 * ```ts
 * import { defineConfig } from '@foundrydb/runtime'
 * export default defineConfig({
 *   project: 'my-app',
 *   resources: {
 *     db: { type: 'postgres', plan: 'tier-2' },
 *     web: { type: 'app', port: 3000, attach: ['db'] },
 *   },
 * })
 * ```
 */
export function defineConfig(config: FoundryConfig): FoundryConfig {
  return config
}

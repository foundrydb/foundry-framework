/**
 * Transform a FoundryConfig into the platform deployment descriptor JSON.
 *
 * Descriptor shape:
 * {
 *   descriptor: {
 *     name: string,
 *     resources: Array<{ logical_name, kind, spec }>,
 *     dependencies: Record<string, string[]>
 *   }
 * }
 *
 * kind = resource.type (postgres, files, auth, app)
 * spec fields are snake_case equivalents of the camelCase config fields.
 */

import type {
  FoundryConfig,
  PostgresResource,
  FilesResource,
  AuthResource,
  AppResource,
  AnyResource,
} from '@foundrydb/runtime'

export interface ResourceDescriptor {
  logical_name: string
  kind: string
  spec: Record<string, unknown>
}

export interface DeployDescriptor {
  name: string
  resources: ResourceDescriptor[]
  dependencies: Record<string, string[]>
}

function buildPostgresSpec(r: PostgresResource): Record<string, unknown> {
  const spec: Record<string, unknown> = {}
  if (r.plan !== undefined) spec['plan'] = r.plan
  if (r.version !== undefined) spec['version'] = r.version
  if (r.extensions !== undefined && r.extensions.length > 0) spec['extensions'] = r.extensions
  if (r.storageGB !== undefined) spec['storage_gb'] = r.storageGB
  return spec
}

function buildFilesSpec(r: FilesResource): Record<string, unknown> {
  const spec: Record<string, unknown> = {}
  if (r.quotaGB !== undefined) spec['quota_gb'] = r.quotaGB
  return spec
}

function buildAuthSpec(r: AuthResource, appName: string): Record<string, unknown> {
  const spec: Record<string, unknown> = { app: `$${appName}` }
  if (r.providers !== undefined && r.providers.length > 0) spec['providers'] = r.providers
  return spec
}

function buildAppSpec(r: AppResource, resources: FoundryConfig['resources']): Record<string, unknown> {
  const spec: Record<string, unknown> = { port: r.port }
  if (r.from !== undefined) spec['from'] = r.from
  if (r.env !== undefined && Object.keys(r.env).length > 0) spec['env'] = r.env
  if (r.attach !== undefined && r.attach.length > 0) {
    // References to other resource logical names use '$name' convention
    spec['attach'] = r.attach.map((name) => {
      // Validate the referenced resource exists
      if (!resources[name]) {
        throw new Error(`App resource references unknown attachment "${name}". Check your foundry.config.ts.`)
      }
      return `$${name}`
    })
  }
  if (r.auth !== undefined) {
    if (!resources[r.auth]) {
      throw new Error(`App resource references unknown auth resource "${r.auth}". Check your foundry.config.ts.`)
    }
    spec['auth'] = `$${r.auth}`
  }
  return spec
}

function buildDependencies(
  name: string,
  resource: AnyResource,
): string[] {
  if (resource.type !== 'app') return []
  const deps: string[] = []
  if (resource.attach) {
    deps.push(...resource.attach)
  }
  if (resource.auth) {
    deps.push(resource.auth)
  }
  return deps
}

export function buildDescriptor(config: FoundryConfig): { descriptor: DeployDescriptor } {
  const entries = Object.entries(config.resources)
  const descriptorResources: ResourceDescriptor[] = []
  const dependencies: Record<string, string[]> = {}

  // Find the canonical app name for auth spec wiring
  const appName =
    entries.find(([, r]) => r.type === 'app')?.[0] ?? 'web'

  for (const [logicalName, resource] of entries) {
    let spec: Record<string, unknown>
    switch (resource.type) {
      case 'postgres':
        spec = buildPostgresSpec(resource)
        break
      case 'files':
        spec = buildFilesSpec(resource)
        break
      case 'auth':
        spec = buildAuthSpec(resource, appName)
        break
      case 'app':
        spec = buildAppSpec(resource, config.resources)
        break
      default: {
        const _exhaustive: never = resource
        throw new Error(`Unknown resource type: ${JSON.stringify(_exhaustive)}`)
      }
    }

    descriptorResources.push({ logical_name: logicalName, kind: resource.type, spec })

    const deps = buildDependencies(logicalName, resource)
    if (deps.length > 0) {
      dependencies[logicalName] = deps
    }
  }

  return {
    descriptor: {
      name: config.project,
      resources: descriptorResources,
      dependencies,
    },
  }
}

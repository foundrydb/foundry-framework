/**
 * Locate, compile, and load foundry.config.ts from the current working directory.
 * Uses esbuild to bundle to a temp .mjs then dynamic-imports it.
 */
import { existsSync, mkdirSync, writeFileSync, unlinkSync } from 'fs'
import { join, resolve } from 'path'
import { tmpdir } from 'os'
import type { FoundryConfig } from '@foundrydb/runtime'

async function findConfigFile(cwd: string): Promise<string> {
  const candidates = [
    join(cwd, 'foundry.config.ts'),
    join(cwd, 'foundry.config.mts'),
    join(cwd, 'foundry.config.js'),
    join(cwd, 'foundry.config.mjs'),
  ]
  for (const candidate of candidates) {
    if (existsSync(candidate)) return candidate
  }
  throw new Error(
    `No foundry.config.ts found in ${cwd}.\n` +
      'Create one with: import { defineConfig } from "@foundrydb/runtime";\n' +
      'export default defineConfig({ project: "my-app", resources: {} })',
  )
}

export async function loadFoundryConfig(cwd: string = process.cwd()): Promise<FoundryConfig> {
  const configPath = await findConfigFile(cwd)

  // Compile + bundle to a temp .mjs using esbuild
  let esbuild: typeof import('esbuild')
  try {
    esbuild = await import('esbuild')
  } catch {
    throw new Error('esbuild is required to compile foundry.config.ts. It should be installed as a dep of the foundry CLI.')
  }

  const outDir = join(tmpdir(), '_foundry_config_build')
  mkdirSync(outDir, { recursive: true })
  const outFile = join(outDir, `foundry-config-${Date.now()}.mjs`)

  await esbuild.build({
    entryPoints: [configPath],
    bundle: true,
    format: 'esm',
    platform: 'node',
    outfile: outFile,
    // Externalize everything except the config itself so we don't bundle node_modules
    packages: 'external',
    // But inline @foundrydb/runtime's defineConfig since it's an identity function
    // The user's project may or may not have it installed; if not, esbuild will error helpfully.
  })

  let mod: { default?: FoundryConfig }
  try {
    mod = (await import(resolve(outFile))) as typeof mod
  } finally {
    try { unlinkSync(outFile) } catch { /* best effort */ }
  }

  const config = mod.default
  if (!config || typeof config !== 'object' || !config.project) {
    throw new Error(
      `foundry.config.ts must export a default FoundryConfig object with at least a "project" field.\n` +
        `Got: ${JSON.stringify(config)}`,
    )
  }
  return config
}

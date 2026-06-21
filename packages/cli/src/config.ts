/**
 * CLI config file management (~/.foundry/config.json).
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs'
import { homedir } from 'os'
import { join } from 'path'

export interface CliConfig {
  apiUrl?: string
  token?: string
}

const CONFIG_DIR = join(homedir(), '.foundry')
const CONFIG_PATH = join(CONFIG_DIR, 'config.json')

export function readCliConfig(): CliConfig {
  if (!existsSync(CONFIG_PATH)) return {}
  try {
    return JSON.parse(readFileSync(CONFIG_PATH, 'utf8')) as CliConfig
  } catch {
    return {}
  }
}

export function writeCliConfig(config: CliConfig): void {
  mkdirSync(CONFIG_DIR, { recursive: true })
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2) + '\n', 'utf8')
}

export function resolveApiUrl(flagValue?: string): string {
  if (flagValue) return flagValue
  const fromEnv = process.env['FOUNDRY_API_URL']
  if (fromEnv) return fromEnv
  const fromFile = readCliConfig().apiUrl
  if (fromFile) return fromFile
  return 'https://api.foundrydb.com'
}

export function resolveToken(envOrFlag?: string): string | undefined {
  if (envOrFlag) return envOrFlag
  const fromEnv = process.env['FOUNDRY_API_TOKEN']
  if (fromEnv) return fromEnv
  return readCliConfig().token
}

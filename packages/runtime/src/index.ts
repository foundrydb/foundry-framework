export { defineConfig } from './config.js'
export type {
  FoundryConfig,
  AnyResource,
  PostgresResource,
  FilesResource,
  AuthResource,
  AppResource,
} from './config.js'

export { db } from './db.js'
export { files } from './files.js'
export type { FilesConfig } from './files.js'
export { auth } from './auth.js'
export { isLocalDev } from './env.js'

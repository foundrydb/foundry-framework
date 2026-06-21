import { readFileSync, writeFileSync, chmodSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const entry = join(__dirname, '..', 'dist', 'index.js')

const content = readFileSync(entry, 'utf8')
if (!content.startsWith('#!/usr/bin/env node')) {
  writeFileSync(entry, '#!/usr/bin/env node\n' + content)
}
chmodSync(entry, 0o755)
console.log('shebang added to dist/index.js')

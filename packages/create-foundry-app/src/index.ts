/**
 * create-foundry-app <name>
 *
 * Scaffolds a new FoundryDB app by copying the template/ directory,
 * substituting {{PROJECT_NAME}} placeholders, then printing next steps.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync, statSync, existsSync } from 'fs'
import { join, dirname, relative } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))

const PLACEHOLDER = '{{PROJECT_NAME}}'

function copyTemplate(templateDir: string, targetDir: string, projectName: string): void {
  const entries = readdirSync(templateDir)
  for (const entry of entries) {
    const srcPath = join(templateDir, entry)
    const stat = statSync(srcPath)

    // Substitute the placeholder in file/dir names too (currently unused but future-proof)
    const destName = entry.replace(PLACEHOLDER, projectName)
    const destPath = join(targetDir, destName)

    if (stat.isDirectory()) {
      mkdirSync(destPath, { recursive: true })
      copyTemplate(srcPath, destPath, projectName)
    } else {
      const raw = readFileSync(srcPath, 'utf8')
      const substituted = raw.replaceAll(PLACEHOLDER, projectName)
      writeFileSync(destPath, substituted, 'utf8')
    }
  }
}

function main(): void {
  const args = process.argv.slice(2)
  const projectName = args[0]

  if (!projectName) {
    console.error('Usage: create-foundry-app <project-name>')
    process.exit(1)
  }

  // Validate project name (npm package name rules)
  if (!/^[a-z0-9]([a-z0-9._-]*[a-z0-9])?$/.test(projectName)) {
    console.error(
      `Invalid project name "${projectName}". ` +
        'Use lowercase letters, numbers, hyphens, and dots only.',
    )
    process.exit(1)
  }

  const targetDir = join(process.cwd(), projectName)
  if (existsSync(targetDir)) {
    console.error(
      `Directory "${projectName}" already exists. Remove it or choose a different name.`,
    )
    process.exit(1)
  }

  // The template directory lives next to this compiled file in dist/,
  // but the actual template files are in packages/create-foundry-app/template/
  // which is included in the npm package's "files" field.
  // Resolve relative to __dirname which is dist/ after build.
  const templateDir = join(__dirname, '..', 'template')

  if (!existsSync(templateDir)) {
    console.error(`Template directory not found: ${templateDir}`)
    process.exit(1)
  }

  console.log(`Creating "${projectName}"...`)
  mkdirSync(targetDir, { recursive: true })
  copyTemplate(templateDir, targetDir, projectName)

  // List files created (relative paths, for confirmation)
  function listFiles(dir: string): string[] {
    const result: string[] = []
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry)
      if (statSync(full).isDirectory()) {
        result.push(...listFiles(full))
      } else {
        result.push(relative(targetDir, full))
      }
    }
    return result
  }

  const created = listFiles(targetDir)
  console.log('\nCreated files:')
  for (const f of created) {
    console.log(`  ${f}`)
  }

  console.log(`
Done! Next steps:

  cd ${projectName}
  npm install
  npx foundry dev       # start local Postgres + MinIO and run Next.js
  npx foundry migrate   # apply SQL migrations
  npx foundry deploy    # ship to FoundryDB

Need help? https://foundrydb.com/docs/framework
`)
}

main()

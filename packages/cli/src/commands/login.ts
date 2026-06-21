import { Command } from 'commander'
import { createInterface } from 'readline'
import { readCliConfig, writeCliConfig, resolveApiUrl } from '../config.js'

async function prompt(question: string): Promise<string> {
  const rl = createInterface({ input: process.stdin, output: process.stdout })
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close()
      resolve(answer.trim())
    })
  })
}

export function registerLogin(program: Command): void {
  program
    .command('login')
    .description('Authenticate with the FoundryDB platform and store credentials locally')
    .option('--api-url <url>', 'FoundryDB API base URL (overrides FOUNDRY_API_URL env and ~/.foundry/config.json)')
    .action(async (opts: { apiUrl?: string }) => {
      const apiUrl = resolveApiUrl(opts.apiUrl)
      console.log(`Authenticating with ${apiUrl}`)
      console.log('You can find your API token at https://foundrydb.com/settings/tokens')
      console.log()

      const token = await prompt('Paste your API token: ')
      if (!token) {
        console.error('No token provided. Aborting.')
        process.exit(1)
      }

      // Verify the token against the API before saving
      const verifyUrl = `${apiUrl}/auth/me`
      let verifyResp: Response
      try {
        verifyResp = await fetch(verifyUrl, {
          headers: { Authorization: `Bearer ${token}` },
        })
      } catch (err) {
        console.error(`Could not reach ${apiUrl}: ${(err as Error).message}`)
        process.exit(1)
      }

      if (!verifyResp.ok) {
        console.error(`Token verification failed (HTTP ${verifyResp.status}). Please check your token and try again.`)
        process.exit(1)
      }

      const existing = readCliConfig()
      writeCliConfig({ ...existing, apiUrl, token })
      console.log(`\nLogged in successfully. Credentials saved to ~/.foundry/config.json`)
    })
}

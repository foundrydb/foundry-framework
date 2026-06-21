import { Command } from 'commander'
import { loadFoundryConfig } from '../load-foundry-config.js'
import { buildDescriptor } from '../descriptor.js'
import { resolveApiUrl, resolveToken } from '../config.js'

interface ResourceStatus {
  logical_name: string
  kind: string
  status: string
  endpoint?: string
  error?: string
}

interface DeploymentStatus {
  deployment_id: string
  project_status: string
  resources: ResourceStatus[]
  project_endpoint?: string
}

function printResourceTable(resources: ResourceStatus[]): void {
  const width = Math.max(...resources.map((r) => r.logical_name.length), 12)
  const header = `  ${'Resource'.padEnd(width)}  ${'Kind'.padEnd(10)}  Status`
  console.log(header)
  console.log('  ' + '-'.repeat(header.length - 2))
  for (const r of resources) {
    const endpoint = r.endpoint ? `  -> ${r.endpoint}` : ''
    const err = r.error ? `  ! ${r.error}` : ''
    console.log(`  ${r.logical_name.padEnd(width)}  ${r.kind.padEnd(10)}  ${r.status}${endpoint}${err}`)
  }
}

export function registerDeploy(program: Command): void {
  program
    .command('deploy')
    .description('Deploy your app and its resources to FoundryDB')
    .option('--env <name>', 'Deployment environment name (default: production)', 'production')
    .option('--api-url <url>', 'FoundryDB API base URL (overrides FOUNDRY_API_URL env and ~/.foundry/config.json)')
    .action(async (opts: { env: string; apiUrl?: string }) => {
      const apiUrl = resolveApiUrl(opts.apiUrl)
      const token = resolveToken()

      if (!token) {
        console.error(
          'No API token found. Run `foundry login` or set FOUNDRY_API_TOKEN environment variable.',
        )
        process.exit(1)
      }

      console.log('Loading foundry.config.ts...')
      let config
      try {
        config = await loadFoundryConfig(process.cwd())
      } catch (err) {
        console.error((err as Error).message)
        process.exit(1)
      }

      console.log(`Project: ${config.project}`)
      console.log(`Environment: ${opts.env}`)
      console.log(`API: ${apiUrl}`)
      console.log()

      const body = buildDescriptor(config)
      console.log('Deploying with descriptor:')
      console.log(JSON.stringify(body, null, 2))
      console.log()

      const deployUrl = `${apiUrl}/projects/deploy`
      let deployResp: Response
      try {
        deployResp = await fetch(deployUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...body, env: opts.env }),
        })
      } catch (err) {
        console.error(`Failed to reach ${apiUrl}: ${(err as Error).message}`)
        process.exit(1)
      }

      if (!deployResp.ok) {
        const text = await deployResp.text()
        console.error(`Deploy request failed (HTTP ${deployResp.status}): ${text}`)
        process.exit(1)
      }

      const deployResult = (await deployResp.json()) as { deployment_id: string; project_status: string; resources?: ResourceStatus[] }
      const deploymentId = deployResult.deployment_id
      console.log(`Deployment started: ${deploymentId}`)
      console.log('Polling for status...\n')

      const pollUrl = `${apiUrl}/projects/${config.project}/deployments/${deploymentId}`
      const pollIntervalMs = 5000
      const maxWaitMs = 30 * 60 * 1000 // 30 minutes

      const startTime = Date.now()
      let lastStatus = ''

      while (Date.now() - startTime < maxWaitMs) {
        await new Promise((r) => setTimeout(r, pollIntervalMs))

        let pollResp: Response
        try {
          pollResp = await fetch(pollUrl, {
            headers: { Authorization: `Bearer ${token}` },
          })
        } catch (err) {
          console.warn(`Poll attempt failed: ${(err as Error).message}. Retrying...`)
          continue
        }

        if (!pollResp.ok) {
          console.warn(`Poll returned HTTP ${pollResp.status}. Retrying...`)
          continue
        }

        const status = (await pollResp.json()) as DeploymentStatus

        if (status.project_status !== lastStatus) {
          lastStatus = status.project_status
          console.log(`Status: ${status.project_status}`)
          if (status.resources?.length) {
            printResourceTable(status.resources)
            console.log()
          }
        }

        if (status.project_status === 'Running') {
          console.log('\nDeployment complete.')
          if (status.project_endpoint) {
            console.log(`Endpoint: ${status.project_endpoint}`)
          }
          process.exit(0)
        }

        if (status.project_status === 'Failed') {
          console.error('\nDeployment failed.')
          if (status.resources?.length) {
            const failed = status.resources.filter((r) => r.status === 'Failed')
            for (const r of failed) {
              console.error(`  ${r.logical_name}: ${r.error ?? 'unknown error'}`)
            }
          }
          process.exit(1)
        }
      }

      console.error('Deployment timed out after 30 minutes. Check the FoundryDB dashboard for status.')
      process.exit(1)
    })
}

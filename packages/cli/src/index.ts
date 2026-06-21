import { Command } from 'commander'
import { registerLogin } from './commands/login.js'
import { registerDeploy } from './commands/deploy.js'
import { registerDev } from './commands/dev.js'
import { registerMigrate } from './commands/migrate.js'

const program = new Command()

program
  .name('foundry')
  .description('Ship your app to the FoundryDB platform')
  .version('0.1.0')

registerLogin(program)
registerDeploy(program)
registerDev(program)
registerMigrate(program)

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error((err as Error).message)
  process.exit(1)
})

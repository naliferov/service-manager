import { createSupervisor } from './src/supervisor/supervisor.js'

const [command, ...args] = process.argv.slice(2)

const commands = {
  'start-supervisor': async () => {
      const supervisor = createSupervisor()
      await supervisor.start()
    },
}

const exec = commands[command]
if (!exec) {
  console.error('Usage: node cli.js <command> [args...]')
  console.error('Commands: start-worker-manager')
  process.exit(1)
}

exec(...args)

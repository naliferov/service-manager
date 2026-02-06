import { createWorkerManager } from './src/worker-manager.js'

const [command, ...args] = process.argv.slice(2)

const commands = {
  'start-worker-manager': async (workersPath) => {
      if (!workersPath) throw new Error('workersPath required')
      const wm = createWorkerManager(workersPath)
      await wm.start()
    },
}

const exec = commands[command]
if (!exec) {
  console.error('Usage: node cli.js <command> [args...]')
  console.error('Commands: start-worker-manager')
  process.exit(1)
}

exec(...args)

import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { getProcessList, processKill, wait, getTime, log } from './utils.js'

//workers path from command like arguments

export const createWorkerManager = () => {

  const run = async() => {
    while (true) {
      await processWorkers()
      await wait(4000)
    }
  }

  return {
    run,
  }
}


const workersPath = process.argv[2]
if (!workersPath) {
  console.error('workers path is required')
  process.exit(1)
}

const getWorkerPid = async (worker) => {
  const path = `workers/${worker}`
  try {
    const pid = await fs.readFile(`${path}/pid`, 'utf8')
    if (pid) return pid.trim()
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

const isWorkerEnabled = async (worker) => {
  const path = `workers/${worker}`
  const conf = JSON.parse(await fs.readFile(`${path}/conf.json`, 'utf8'))
  return conf.enabled
}

const isProcessActive = async (pid) => {
  const processList = await getProcessList()
  return processList[pid] ? true : false
}

const runWorker = async(worker) => {
  const path = `workers/${worker}`
  const workerFile = `${path}/worker.js`
  const logFile = await fs.open(`${path}/worker.log`, 'a')

  const child = spawn('node', [workerFile], {
    detached: true,
    stdio: ['ignore', logFile.fd, logFile.fd],
  })

  const pid = child.pid

  child.unref()
  await logFile.close()

  return pid
}

const runWorkerIfNotActive = async (worker, pid) => {

  const path = `workers/${worker}`

  if (pid) {
    let str = `pid [${pid}]`

    if (await isProcessActive(pid)) {
      str += ` active`
    } else {
      str += ` not active. start [${worker}]`

      const newPid = await runWorker(worker)
      str += ` pid [${newPid}] started`
      await fs.writeFile(`${path}/pid`, newPid)
    }

    log(str)
    return
  }

  log(`pid not found. start [${worker}]`)
  const newPid = await runWorker(worker)
  log(` pid [${newPid}]`)
  await fs.writeFile(`${path}/pid`, newPid)
}

const stopWorkerIfActive = async (worker, pid) => {
  if (!pid) {
    log(`pid not found. ok`)
    return
  }

  const path = `workers/${worker}`

  let processIsActive = await isProcessActive(pid)
  if (!processIsActive) {
    log(`proc [${pid}] not active. ok`)
    return
  }

  log(`proc [${pid}] active. try to stop it`)
  await processKill(pid)

  processIsActive = await isProcessActive(pid)
  if (!processIsActive) {
    log(`proc [${pid}] stopped`)
    await fs.unlink(`${path}/pid`)
    log(`remove pid [${pid}]`)
    return
  }
}

const processWorker = async (worker) => {
  log(`[${worker}] worker`)

  const enabled = await isWorkerEnabled(worker)
  const pid = await getWorkerPid(worker)

  if (enabled) {
    log(`is enabled`)
    await runWorkerIfNotActive(worker, pid)
    log('\n', true)
    return
  }

  log(`is disabled`)
  await stopWorkerIfActive(worker, pid)
  
  log('\n', true)
}

const processWorkers = async () => {
  const workers = await fs.readdir('workers')
  for (const worker of workers) {
    await processWorker(worker)
  }
}

while (true) {
  await processWorkers()
  await wait(4000)
}

//const list = await processList()
//console.log(list)

//processKill(12345)
import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { getProcessList, processKill, wait, getTime, log } from './utils.js'

const getWorkerPid = async (workerPath) => {
  try {
    const pid = await fs.readFile(`${workerPath}/pid`, 'utf8')
    if (pid) return pid.trim()
  } catch (error) {
    if (error.code !== 'ENOENT') throw error
  }
}

const removePidFile = async (workerPath) => {
  await fs.unlink(`${workerPath}/pid`)
}

const isWorkerEnabled = async (workerPath) => {
  const conf = JSON.parse(await fs.readFile(`${workerPath}/conf.json`, 'utf8'))
  return conf.enabled
}

const isProcessActive = async (pid) => {
  const processList = await getProcessList()
  return processList[pid] ? true : false
}

const startWorker = async(workerPath) => {
  const logFile = await fs.open(`${workerPath}/worker.log`, 'a')

  const child = spawn('node', [`${workerPath}/worker.js`], {
    detached: true,
    stdio: ['ignore', logFile.fd, logFile.fd],
  })

  const pid = child.pid

  child.unref()
  await logFile.close()

  return pid
}

const startWorkerIfInactive = async (workerPath, pid) => {

  if (pid) {
    let str = `pid [${pid}]`

    if (await isProcessActive(pid)) {
      str += ` active`
    } else {
      str += ` not active. start [${workerPath}]`

      const newPid = await startWorker(workerPath)
      str += ` pid [${newPid}] started`
      await fs.writeFile(`${workerPath}/pid`, String(newPid))
    }

    log(str)
    return
  }

  log(`pid not found. start [${workerPath}]`)
  const newPid = await startWorker(workerPath)
  log(` pid [${newPid}]`)
  await fs.writeFile(`${workerPath}/pid`, String(newPid))
}

const stopWorkerIfActive = async (workerPath, pid) => {
  if (!pid) {
    log(`pid not found`)
    return
  }

  let processIsActive = await isProcessActive(pid)
  if (!processIsActive) {
    log(`proc [${pid}] not active`)
    await removePidFile(workerPath)
    return
  }

  log(`proc [${pid}] active. try to stop it`)
  await processKill(pid)

  processIsActive = await isProcessActive(pid)
  if (!processIsActive) {
    log(`proc [${pid}] stopped`)
    await removePidFile(workerPath)
    log(`remove pid [${pid}]`)
    return
  }
}

const processWorker = async (workersPath, worker) => {

  const workerPath = `${workersPath}/${worker}`
  const enabled = await isWorkerEnabled(workerPath)
  const pid = await getWorkerPid(workerPath)
  
  if (enabled) {
    log(`[${worker}] enabled`)
    await startWorkerIfInactive(workerPath, pid)
  } else {
    log(`[${worker}] disabled`)
    await stopWorkerIfActive(workerPath, pid)  
  }
}

const processWorkers = async (workersPath) => {
  const workers = await fs.readdir(workersPath)
  for (const worker of workers) {
    await processWorker(workersPath, worker)
  }
}

export const createWorkerManager = (workersPath) => {

  const start = async() => {
    while (true) {
      await processWorkers(workersPath)
      await wait(4000)
    }
  }

  return { start }
}
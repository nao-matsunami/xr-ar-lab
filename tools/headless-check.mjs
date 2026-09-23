#!/usr/bin/env node
// tools/headless-check.mjs
//
// ヘッドレス Chrome でページを開き、
//   - コンソールのエラー / 例外
//   - 発行した全リクエストの URL（外部ドメインが混ざっていないか）
//   - 任意の JS 式の評価結果
// を出す。依存パッケージなし（Node 22 の組み込み WebSocket で CDP を直接叩く）。
//
//   node tools/headless-check.mjs http://127.0.0.1:8811/showcase/ \
//     --wait 12000 --eval "typeof XR8" --eval "window.__XR_ENGINE_LICENSE"

import {spawn} from 'node:child_process'
import {setTimeout as sleep} from 'node:timers/promises'

const args = process.argv.slice(2)
const url = args[0]
if (!url) {
  console.error('usage: headless-check.mjs <url> [--wait ms] [--eval expr]...')
  process.exit(2)
}
const waitMs = Number((args[args.indexOf('--wait') + 1]) || 10000)
const evals = args.reduce((acc, a, i) => (a === '--eval' ? [...acc, args[i + 1]] : acc), [])

const CHROME = process.env.CHROME_BIN || 'google-chrome'
const PORT = 9333 + (process.pid % 200)

const chrome = spawn(CHROME, [
  '--headless=new',
  `--remote-debugging-port=${PORT}`,
  '--no-sandbox',
  '--disable-gpu-sandbox',
  '--enable-unsafe-swiftshader',
  '--use-gl=swiftshader',
  '--use-fake-ui-for-media-stream',
  '--use-fake-device-for-media-stream',
  '--autoplay-policy=no-user-gesture-required',
  '--window-size=800,1200',
  'about:blank',
], {stdio: ['ignore', 'ignore', 'pipe']})

const chromeStderr = []
chrome.stderr.on('data', d => chromeStderr.push(d.toString()))

const cleanup = () => { try { chrome.kill('SIGKILL') } catch (e) { /* noop */ } }
process.on('exit', cleanup)

const fetchJson = async (path) => {
  for (let i = 0; i < 100; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}${path}`)
      if (r.ok) { return r.json() }
    } catch (e) { /* まだ起動中 */ }
    await sleep(100)
  }
  throw new Error('chrome devtools did not come up')
}

const version = await fetchJson('/json/version')
const ws = new WebSocket(version.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

let msgId = 0
const pending = new Map()
const events = []
ws.onmessage = (e) => {
  const m = JSON.parse(e.data)
  if (m.id && pending.has(m.id)) {
    const {resolve, reject} = pending.get(m.id)
    pending.delete(m.id)
    m.error ? reject(new Error(JSON.stringify(m.error))) : resolve(m.result)
  } else if (m.method) {
    events.push(m)
  }
}
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const id = ++msgId
  pending.set(id, {resolve, reject})
  ws.send(JSON.stringify({id, method, params, ...(sessionId ? {sessionId} : {})}))
})

const {targetId} = await send('Target.createTarget', {url: 'about:blank'})
const {sessionId} = await send('Target.attachToTarget', {targetId, flatten: true})
const s = (method, params) => send(method, params, sessionId)

await s('Runtime.enable')
await s('Log.enable')
await s('Network.enable')
await s('Page.enable')

await s('Page.navigate', {url})
await sleep(waitMs)

const shotPath = args.includes('--screenshot') ? args[args.indexOf('--screenshot') + 1] : null
if (shotPath) {
  const shot = await s('Page.captureScreenshot', {format: 'png', captureBeyondViewport: true})
  const {writeFile} = await import('node:fs/promises')
  await writeFile(shotPath, Buffer.from(shot.data, 'base64'))
}

const results = []
for (const expr of evals) {
  try {
    const r = await s('Runtime.evaluate', {expression: expr, returnByValue: true, awaitPromise: true})
    results.push({expr, value: r.result && ('value' in r.result ? r.result.value : r.result.description)})
  } catch (e) {
    results.push({expr, error: String(e)})
  }
}

const consoleErrors = []
const consoleAll = []
const requests = []
for (const m of events) {
  if (m.method === 'Runtime.consoleAPICalled') {
    const text = (m.params.args || [])
      .map(a => ('value' in a ? a.value : a.description)).join(' ')
    consoleAll.push({level: m.params.type, text})
    if (m.params.type === 'error') { consoleErrors.push(text) }
  } else if (m.method === 'Runtime.exceptionThrown') {
    const d = m.params.exceptionDetails
    consoleErrors.push(`EXCEPTION ${d.text} ${d.exception ? d.exception.description : ''}`)
  } else if (m.method === 'Log.entryAdded') {
    const e = m.params.entry
    consoleAll.push({level: e.level, text: e.text, url: e.url})
    if (e.level === 'error') { consoleErrors.push(`${e.text} (${e.url || ''})`) }
  } else if (m.method === 'Network.requestWillBeSent') {
    requests.push(m.params.request.url)
  }
}

const pageOrigin = new URL(url).origin
const external = [...new Set(requests)].filter(u =>
  !u.startsWith(pageOrigin) && !u.startsWith('data:') && !u.startsWith('blob:'))

console.log(JSON.stringify({
  url,
  evals: results,
  consoleErrorCount: consoleErrors.length,
  consoleErrors,
  requestCount: requests.length,
  externalRequests: external,
  cdn8thwallRequests: requests.filter(u => u.includes('cdn.8thwall.com')),
  console: consoleAll,
}, null, 2))

cleanup()
process.exit(0)

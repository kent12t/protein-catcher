import assert from 'node:assert/strict'
import test from 'node:test'
import { mkdtemp, readdir, readFile, rm, writeFile } from 'node:fs/promises'
import { createServer, request } from 'node:http'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { isGameResult, isLocalhost, RESULTS_ENDPOINT, resultsToCsv } from '../src/offlineTracking.ts'
import { createResultWriter, createTrackingMiddleware } from '../server/offlineTracking.ts'

const success = {
  weightKg: 65,
  ageGroup: '50 and above',
  scoreGrams: 80,
  targetGrams: 78,
  success: true,
  elapsedSeconds: 10.25,
  startedAt: '2026-10-23T12:00:00.000Z',
}

test('tracking only accepts loopback hostnames', () => {
  for (const hostname of ['localhost', '127.0.0.1', '[::1]', '::1']) {
    assert.equal(isLocalhost(hostname), true)
  }
  for (const hostname of ['example.com', 'localhost.example.com', '192.168.1.5', '10.0.0.1', '']) {
    assert.equal(isLocalhost(hostname), false)
  }
})

test('only accepts complete, valid game results', () => {
  assert.equal(isGameResult(success), true)
  for (const result of [null, {}, { ...success, elapsedSeconds: '10' }, { ...success, weightKg: -1 }, { ...success, startedAt: 'invalid' }]) {
    assert.equal(isGameResult(result), false)
  }
})

test('exports wins and losses with units, start time, and spreadsheet-friendly CSV', () => {
  const failure = { ...success, ageGroup: 'Below 50', scoreGrams: 20, targetGrams: 52, success: false, elapsedSeconds: 15 }
  assert.equal(resultsToCsv([success, failure]),
    '\uFEFF"weight_kg","age_group","score_grams","target_grams","success","time_taken_seconds","time_start_iso"\r\n'
    + '"65","50 and above","80","78","true","10.25","2026-10-23T12:00:00.000Z"\r\n'
    + '"65","Below 50","20","52","false","15","2026-10-23T12:00:00.000Z"\r\n')
  assert.equal(resultsToCsv([success], false), '"65","50 and above","80","78","true","10.25","2026-10-23T12:00:00.000Z"\r\n')
})

test('creates a device CSV, appends concurrent games, and reuses it after restart', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'protein-tracking-'))
  t.after(() => rm(root, { recursive: true, force: true }))
  const append = createResultWriter(root)
  await Promise.all(Array.from({ length: 5 }, () => append(success)))
  const files = await readdir(join(root, 'offline-results'))
  assert.equal(files.length, 1)
  assert.match(files[0], /^protein-catcher-[a-f0-9-]{36}\.csv$/)
  const path = join(root, 'offline-results', files[0])
  assert.equal(await readFile(path, 'utf8'), resultsToCsv(Array(5).fill(success)))
  await createResultWriter(root)(success)
  assert.equal(await readFile(path, 'utf8'), resultsToCsv(Array(6).fill(success)))

  // Preserve local edits, including a final row without a newline.
  const edited = (await readFile(path, 'utf8')).trimEnd().replace('"65"', '"66"')
  await writeFile(path, edited)
  await append(success)
  assert.equal(await readFile(path, 'utf8'), edited + '\r\n' + resultsToCsv([success], false))

  const otherRoot = await mkdtemp(join(tmpdir(), 'protein-tracking-other-'))
  t.after(() => rm(otherRoot, { recursive: true, force: true }))
  await createResultWriter(otherRoot)(success)
  assert.notEqual((await readdir(join(otherRoot, 'offline-results')))[0], files[0])
})

test('local endpoint persists results and rejects hosted or invalid requests', async (t) => {
  const root = await mkdtemp(join(tmpdir(), 'protein-tracking-http-'))
  const middleware = createTrackingMiddleware(root)
  const server = createServer((request, response) => {
    void middleware(request, response, () => response.writeHead(404).end())
  })
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve))
  t.after(async () => {
    await new Promise(resolve => server.close(resolve))
    await rm(root, { recursive: true, force: true })
  })
  const url = `http://127.0.0.1:${server.address().port}${RESULTS_ENDPOINT}`
  const post = { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(success) }
  assert.equal((await fetch(url, { ...post, headers: { ...post.headers, Origin: 'https://example.com' } })).status, 403)
  const hostedStatus = await new Promise((resolve, reject) => {
    const req = request(url, { method: 'POST', headers: { Host: 'example.com' } }, response => {
      response.resume()
      resolve(response.statusCode)
    })
    req.on('error', reject)
    req.end(JSON.stringify(success))
  })
  assert.equal(hostedStatus, 403)
  assert.equal((await fetch(url)).status, 405)
  assert.equal((await fetch(url, { ...post, body: '{' })).status, 400)
  assert.equal((await fetch(url, { ...post, body: '{}' })).status, 400)
  assert.equal((await fetch(url, post)).status, 204)
  const [filename] = await readdir(join(root, 'offline-results'))
  assert.equal(await readFile(join(root, 'offline-results', filename), 'utf8'), resultsToCsv([success]))
})

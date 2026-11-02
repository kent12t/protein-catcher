import assert from 'node:assert/strict'
import test from 'node:test'
import { csvRows, emptyFilters, filterResults, parseResults } from '../src/results/data.ts'

const header = 'weight_kg,age_group,score_grams,target_grams,success,time_taken_seconds,time_start_iso,language'
const csv = header + '\r\n56,Below 50,46,45,true,7.67,2026-10-28T08:44:29.942Z,\r\n69,50 and above,22,83,false,15,2026-10-29T09:00:00.000Z,zh\r\n'

test('CSV supports BOM, quotes, commas, CRLF and multiline fields', () => {
  assert.deepEqual(csvRows('\uFEFF"a","b"\r\n"c,d","escaped ""quote""\nnext"\r\n'), [['a', 'b'], ['c,d', 'escaped "quote"\nnext']])
  assert.throws(() => csvRows('"unterminated'))
})

test('results retain historical blank languages and validate rows', () => {
  const parsed = parseResults(csv, 'device.csv')
  assert.equal(parsed.results.length, 2)
  assert.equal(parsed.results[0].language, 'unknown')
  assert.equal(parsed.results[1].success, false)
  assert.equal(parsed.results[0].source, 'device.csv')
  assert.equal(parseResults(csv.replace('56,Below', ',Below'), 'device.csv').skipped, 1)
  assert.equal(parseResults(csv.replace(',true,', ',yes,'), 'device.csv').skipped, 1)
  assert.throws(() => parseResults('wrong,header\n1,2', 'bad.csv'))
})

test('legacy CSV without language column is supported', () => {
  const legacy = csv.split('\r\n').filter(Boolean).map((r) => r.slice(0, r.lastIndexOf(','))).join('\n')
  assert.equal(parseResults(legacy, 'old.csv').results[1].language, 'unknown')
})

test('filters combine and include both UTC date boundaries', () => {
  const { results } = parseResults(csv, 'device.csv')
  assert.equal(filterResults(results, emptyFilters).length, 2)
  const filters = { ...emptyFilters, from: '2026-10-29', to: '2026-10-29', age: '50 and above', language: 'zh', outcome: 'false', min: '69', max: '69', source: 'device.csv' }
  assert.deepEqual(filterResults(results, filters), [results[1]])
  assert.equal(filterResults(results, { ...filters, max: '68' }).length, 0)
  assert.equal(filterResults(results, { ...filters, from: '2026-10-30' }).length, 0)
})

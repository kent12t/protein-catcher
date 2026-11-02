export type Result = {
  source: string
  weight: number
  age: string
  score: number
  target: number
  success: boolean
  seconds: number
  date: string
  language: string
}

// CSV state machine handles BOMs, escaped quotes, CRLF and quoted newlines.
export function csvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = [], value = '', quoted = false
  text = text.replace(/^\uFEFF/, '')
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (c === '"') {
      if (quoted && text[i + 1] === '"') { value += '"'; i++ }
      else quoted = !quoted
    } else if (!quoted && (c === ',' || c === '\n' || c === '\r')) {
      row.push(value); value = ''
      if (c !== ',') {
        if (row.some(Boolean)) rows.push(row)
        row = []
        if (c === '\r' && text[i + 1] === '\n') i++
      }
    } else value += c
  }
  if (quoted) throw new Error('Unclosed quoted field')
  row.push(value)
  if (row.some(Boolean)) rows.push(row)
  return rows
}

export function parseResults(text: string, source: string) {
  const [header, ...rows] = csvRows(text)
  const required = ['weight_kg', 'age_group', 'score_grams', 'target_grams', 'success', 'time_taken_seconds', 'time_start_iso']
  if (!header || required.some((key) => !header.includes(key))) throw new Error(`${source}: missing required CSV columns`)
  let skipped = 0
  const results: Result[] = []
  for (const row of rows) {
    const get = (key: string) => row[header.indexOf(key)]?.trim() ?? ''
    const numeric = (key: string) => get(key) === '' ? NaN : Number(get(key))
    const result = {
      source, weight: numeric('weight_kg'), age: get('age_group'), score: numeric('score_grams'),
      target: numeric('target_grams'), success: get('success') === 'true',
      seconds: numeric('time_taken_seconds'), date: get('time_start_iso'), language: get('language') || 'unknown',
    }
    if (row.length !== header.length || ![result.weight, result.score, result.target, result.seconds].every(Number.isFinite)
      || result.weight <= 0 || result.target <= 0 || result.score < 0 || result.seconds < 0
      || !['Below 50', '50 and above'].includes(result.age) || !['true', 'false'].includes(get('success'))
      || !Number.isFinite(Date.parse(result.date))) { skipped++; continue }
    result.date = new Date(result.date).toISOString()
    results.push(result)
  }
  return { results, skipped }
}

export type Filters = { age: string; language: string; outcome: string; source: string; from: string; to: string; min: string; max: string }
export const emptyFilters: Filters = { age: '', language: '', outcome: '', source: '', from: '', to: '', min: '', max: '' }
// Fixed UTC+8, independent of the browser's local timezone. No DST adjustment.
export function utc8DateTime(date: string) {
  return new Date(Date.parse(date) + 8 * 60 * 60 * 1000).toISOString().slice(0, 19)
}
export function filterResults(rows: Result[], filters: Filters) {
  return rows.filter((r) => (!filters.age || r.age === filters.age)
    && (!filters.language || r.language === filters.language)
    && (!filters.outcome || String(r.success) === filters.outcome)
    && (!filters.source || r.source === filters.source)
    && (!filters.from || utc8DateTime(r.date).slice(0, 10) >= filters.from)
    && (!filters.to || utc8DateTime(r.date).slice(0, 10) <= filters.to)
    && (filters.min === '' || r.weight >= Number(filters.min))
    && (filters.max === '' || r.weight <= Number(filters.max)))
}

import { StrictMode, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { BarChart3, Download, SlidersHorizontal, Upload, ArrowUpRight } from 'lucide-react'
import { emptyFilters, filterResults, parseResults, utc8DateTime } from './data'
import type { Filters, Result } from './data'
import './style.css'

const files = import.meta.glob('../../offline-results/*.csv', { eager: true, query: '?raw', import: 'default' }) as Record<string, string>
const languages: Record<string, string> = { en: 'English', ms: 'Malay', zh: 'Chinese', ta: 'Tamil', unknown: 'Not recorded' }
function loadFiles(entries: [string, string][]) {
  const results: Result[] = [], notices: string[] = []
  for (const [name, text] of entries) {
    try {
      const parsed = parseResults(text, name.split('/').pop()!)
      results.push(...filterResults(parsed.results, { ...emptyFilters, from: '2026-10-30', to: '2026-10-31' }))
      if (parsed.skipped) notices.push(`${name}: skipped ${parsed.skipped} invalid rows.`)
    } catch (error) { notices.push(String(error)) }
  }
  return { results, notices }
}
const initial = loadFiles(Object.entries(files))
const average = (rows: Result[], key: 'score' | 'seconds') => rows.length ? (rows.reduce((sum, r) => sum + r[key], 0) / rows.length).toFixed(1) : '—'
const rate = (rows: Result[]) => rows.length ? Math.round(rows.filter((r) => r.success).length / rows.length * 100) : 0

export function App() {
  const [data, setData] = useState(initial)
  const [filters, setFilters] = useState<Filters>(emptyFilters)
  const [sort, setSort] = useState('newest')
  const [page, setPage] = useState(0)
  const rows = useMemo(() => filterResults(data.results, filters).sort((a, b) => sort === 'score' ? b.score - a.score : sort === 'time' ? a.seconds - b.seconds : sort === 'oldest' ? a.date.localeCompare(b.date) : b.date.localeCompare(a.date)), [data.results, filters, sort])
  const update = (key: keyof Filters, value: string) => { setFilters((f) => ({ ...f, [key]: value })); setPage(0) }
  const days = [...new Set(rows.map((r) => utc8DateTime(r.date).slice(0, 10)))].sort()
  const daily = days.map((day) => ({ day, rows: rows.filter((r) => utc8DateTime(r.date).startsWith(day)) }))
  const maxDaily = Math.max(1, ...daily.map((d) => d.rows.length))
  const active = Object.values(filters).filter(Boolean).length
  const pages = Math.max(1, Math.ceil(rows.length / 20))
  const currentPage = Math.min(page, pages - 1)
  function download() {
    const header = ['weight_kg', 'age_group', 'score_grams', 'target_grams', 'success', 'time_taken_seconds', 'time_start_iso', 'language', 'source']
    const csv = '\uFEFF' + [header, ...rows.map((r) => [r.weight, r.age, r.score, r.target, r.success, r.seconds, r.date, r.language === 'unknown' ? '' : r.language, r.source])].map((row) => row.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const a = document.createElement('a'); a.href = url; a.download = 'protein-catcher-filtered.csv'; a.click(); URL.revokeObjectURL(url)
  }
  return <>
    <header className="topbar"><div className="brand"><span className="brand-icon"><BarChart3 size={22} /></span> Protein Catcher <span className="divider">/</span><span className="muted">Results explorer</span></div><span className="local-badge">● Offline analytics</span></header>
    <main>
      <section className="heading"><div><div className="eyebrow">PLAY DATA, MADE CLEAR</div><h1>A closer look at every catch.</h1><p>Explore game performance, spot patterns, and compare your players.</p></div><div className="actions"><label className="button"><Upload size={16} /> Open CSVs<input type="file" accept=".csv,text/csv" multiple onChange={async (e) => {
        const selected = Array.from(e.target.files ?? [])
        if (!selected.length) return
        try { setData(loadFiles(await Promise.all(selected.map(async (f): Promise<[string, string]> => [f.name, await f.text()])))); setPage(0); setFilters(emptyFilters) }
        catch (error) { setData((d) => ({ ...d, notices: [String(error)] })) }
        e.target.value = ''
      }} /></label><button className="primary" onClick={download} disabled={!rows.length}><Download size={16} /> Export filtered</button></div></section>
      <p className="source-note">{data.results.length.toLocaleString()} valid games · {new Set(data.results.map((r) => r.source)).size} source files · Dates, times, daily charts and date filters use UTC+8. CSV exports retain original UTC timestamps. Built-in data is a build-time snapshot; open CSVs to replace it with current local files. <button className="text-button" onClick={() => { setData(initial); setFilters(emptyFilters); setPage(0) }}>Restore bundled data</button></p>
      {data.notices.length > 0 && <div className="notice" role="status">{data.notices.map((n, i) => <div key={i}>{n}</div>)}</div>}
      <section className="filters panel" aria-label="Filter results"><div className="filter-title"><SlidersHorizontal size={17} /><strong>Filters</strong><span className="muted">{active ? `${active} active` : 'All games'}</span><button className="text-button" onClick={() => { setFilters(emptyFilters); setPage(0) }}>Reset all</button></div><div className="filter-grid">
        <label>From date (UTC+8)<input type="date" value={filters.from} onChange={(e) => update('from', e.target.value)} /></label>
        <label>To date (UTC+8)<input type="date" value={filters.to} onChange={(e) => update('to', e.target.value)} /></label>
        <label>Age group<select value={filters.age} onChange={(e) => update('age', e.target.value)}><option value="">All ages</option>{['Below 50', '50 and above'].map((a) => <option key={a}>{a}</option>)}</select></label>
        <label>Language<select value={filters.language} onChange={(e) => update('language', e.target.value)}><option value="">All languages</option>{[...new Set(data.results.map((r) => r.language))].sort().map((l) => <option key={l} value={l}>{languages[l] ?? l}</option>)}</select></label>
        <label>Outcome<select value={filters.outcome} onChange={(e) => update('outcome', e.target.value)}><option value="">All outcomes</option><option value="true">Goal reached</option><option value="false">Below goal</option></select></label>
        <label>Source file<select value={filters.source} onChange={(e) => update('source', e.target.value)}><option value="">All files</option>{[...new Set(data.results.map((r) => r.source))].map((s) => <option key={s}>{s}</option>)}</select></label>
        <label>Min weight (kg)<input type="number" min="0" placeholder="No minimum" value={filters.min} onChange={(e) => update('min', e.target.value)} /></label>
        <label>Max weight (kg)<input type="number" min="0" placeholder="No maximum" value={filters.max} onChange={(e) => update('max', e.target.value)} /></label>
      </div></section>
      <section className="stats" aria-label="Summary"><Stat label="Games played" value={rows.length.toLocaleString()} detail={`${data.results.length.toLocaleString()} games in loaded data`} /><Stat label="Success rate" value={rows.length ? `${rate(rows)}%` : '—'} detail={`${rows.filter((r) => r.success).length} goals reached`} /><Stat label="Average protein caught" value={`${average(rows, 'score')}${rows.length ? ' g' : ''}`} detail="Across filtered games" /><Stat label="Average play time" value={`${average(rows, 'seconds')}${rows.length ? ' s' : ''}`} detail="Excludes countdown and animations" /></section>
      <section className="charts"><article className="panel"><div className="chart-heading"><div><h2>Games over time</h2><p>Daily activity, split by outcome</p></div><div className="legend"><span>● Goal reached</span><span>● Below goal</span></div></div>{rows.length ? <div className="daily-chart">{daily.map(({ day, rows: group }) => <div className="day" key={day}><span className="bar-count">{group.length}</span><div className="bar-space"><div className="stack" style={{ height: `${group.length / maxDaily * 100}%` }} title={`${day}: ${group.length} games, ${rate(group)}% successful`}><div className="failure-bar" style={{ flex: group.filter((r) => !r.success).length }} /><div className="success-bar" style={{ flex: group.filter((r) => r.success).length }} /></div></div><span>{day.slice(5)}</span></div>)}</div> : <Empty />}</article>
      <article className="panel"><h2>Success by age group</h2><p>Percentage of games reaching the protein goal</p><div className="cohorts">{['Below 50', '50 and above'].map((age) => { const group = rows.filter((r) => r.age === age); return <div key={age}><div className="cohort-label"><strong>{age}</strong><span>{group.length ? `${rate(group)}%` : '—'} <small> / {group.length} games</small></span></div><div className="track"><div style={{ width: `${rate(group)}%` }} /></div></div> })}</div><p className="chart-foot">Each record represents one game, not a unique player. Unusual weights are kept; use weight filters to explore them.</p></article></section>
      <section className="panel records"><div className="chart-heading"><div><h2>Game records <span className="count">{rows.length}</span></h2><p>The detail behind the numbers</p></div><label className="sort-label">Sort by <select value={sort} onChange={(e) => { setSort(e.target.value); setPage(0) }}><option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="score">Highest score</option><option value="time">Fastest game</option></select></label></div><div className="table-scroll"><table><thead><tr>{['Started (UTC+8)', 'Age group', 'Weight', 'Language', 'Protein / goal', 'Play time', 'Outcome', 'Source'].map((h) => <th key={h}>{h}</th>)}</tr></thead><tbody>{rows.slice(currentPage * 20, currentPage * 20 + 20).map((r, i) => <tr key={`${r.source}-${r.date}-${i}`}><td>{utc8DateTime(r.date).slice(0, 10)} <span className="muted">{utc8DateTime(r.date).slice(11, 19)}</span></td><td>{r.age}</td><td>{r.weight} kg</td><td>{languages[r.language] ?? r.language}</td><td><strong>{r.score}</strong><span className="muted"> / {r.target} g</span></td><td>{r.seconds.toFixed(2)} s</td><td><span className={`outcome ${r.success ? 'won' : ''}`}>{r.success ? 'Goal reached' : 'Below goal'}</span></td><td className="source-cell" title={r.source}>{r.source}</td></tr>)}</tbody></table></div>{!rows.length && <Empty />}<div className="pagination"><span>{rows.length ? `${currentPage * 20 + 1}–${Math.min((currentPage + 1) * 20, rows.length)} of ${rows.length} games` : '0 games'}</span><div><button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)}>Previous</button><span> {currentPage + 1} / {pages} </span><button disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)}>Next</button></div></div></section>
      <footer>PROTEIN CATCHER / RESULTS EXPLORER <span>Processed in your browser. No uploads, no external analytics.</span></footer>
    </main>
  </>
}
function Stat({ label, value, detail }: { label: string; value: string; detail: string }) { return <article className="panel stat"><div>{label}<ArrowUpRight size={16} /></div><strong>{value}</strong><p>{detail}</p></article> }
function Empty() { return <div className="empty">No games to show. Adjust your filters or open a results CSV.</div> }
createRoot(document.getElementById('root')!).render(<StrictMode><App /></StrictMode>)

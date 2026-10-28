export type GameResult = {
  language: 'en' | 'ms' | 'zh' | 'ta'
  weightKg: number
  ageGroup: 'Below 50' | '50 and above'
  scoreGrams: number
  targetGrams: number
  success: boolean
  elapsedSeconds: number
  startedAt: string
}

export const RESULTS_ENDPOINT = '/__offline-tracking/results'

export function isLocalhost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname === '::1'
}

export function isGameResult(value: unknown): value is GameResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Partial<GameResult>
  return typeof result.weightKg === 'number' && Number.isFinite(result.weightKg) && result.weightKg > 0
    && (result.language === 'en' || result.language === 'ms' || result.language === 'zh' || result.language === 'ta')
    && (result.ageGroup === 'Below 50' || result.ageGroup === '50 and above')
    && typeof result.scoreGrams === 'number' && Number.isFinite(result.scoreGrams) && result.scoreGrams >= 0
    && typeof result.targetGrams === 'number' && Number.isFinite(result.targetGrams) && result.targetGrams > 0
    && typeof result.success === 'boolean'
    && typeof result.elapsedSeconds === 'number' && Number.isFinite(result.elapsedSeconds) && result.elapsedSeconds >= 0
    && typeof result.startedAt === 'string' && Number.isFinite(Date.parse(result.startedAt))
    && new Date(result.startedAt).toISOString() === result.startedAt
}

export function resultsToCsv(results: GameResult[], includeHeader = true) {
  const rows = [
    ...(includeHeader ? [['weight_kg', 'age_group', 'score_grams', 'target_grams', 'success', 'time_taken_seconds', 'time_start_iso', 'language']] : []),
    ...results.map((result) => [
      result.weightKg, result.ageGroup, result.scoreGrams, result.targetGrams,
      result.success, result.elapsedSeconds, result.startedAt, result.language,
    ]),
  ]
  return (includeHeader ? '\uFEFF' : '') + rows.map((row) => row.map((value) =>
    `"${String(value).replaceAll('"', '""')}"`,
  ).join(',')).join('\r\n') + '\r\n'
}

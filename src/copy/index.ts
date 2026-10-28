import en from './en'
import ms from './ms'
import zh from './zh'
import ta from './ta'

export const copies = { en, ms, zh, ta }
export type Language = keyof typeof copies
export const languages: { code: Language; label: string }[] = [
  { code: 'en', label: 'ENGLISH' },
  { code: 'ms', label: 'BAHASA MELAYU' },
  { code: 'zh', label: '中文' },
  { code: 'ta', label: 'தமிழ்' },
]

export function localizedImage(name: 'start_button' | 'restart_button' | 'end_title' | 'cheatsheet', language: Language) {
  const suffix = name === 'cheatsheet' || language !== 'en' ? `_${language}` : ''
  return `/misc/${name}${suffix}.webp`
}

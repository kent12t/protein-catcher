import { useEffect, useState } from 'react'
import { AudioLines, Music } from 'lucide-react'
import { audio } from './audio'
import type { Copy } from './copy/en'

export function SoundControls({ copy }: { copy: Copy }) {
  const [bgmMuted, setBgmMuted] = useState(audio.isBgmMuted)
  const [sfxMuted, setSfxMuted] = useState(audio.isSfxMuted)

  useEffect(() => {
    const unlock = () => audio.startBgm()
    window.addEventListener('pointerdown', unlock, true)
    return () => window.removeEventListener('pointerdown', unlock, true)
  }, [])

  return (
    <div className="sound-controls">
      <button
        type="button"
        className={bgmMuted ? 'is-muted' : ''}
        aria-label={bgmMuted ? copy.unmuteMusic : copy.muteMusic}
        aria-pressed={bgmMuted}
        onClick={() => {
          const next = !bgmMuted
          audio.setBgmMuted(next)
          setBgmMuted(next)
        }}
      >
        <Music size={14} strokeWidth={2.25} />
      </button>
      <button
        type="button"
        className={sfxMuted ? 'is-muted' : ''}
        aria-label={sfxMuted ? copy.unmuteEffects : copy.muteEffects}
        aria-pressed={sfxMuted}
        onClick={() => {
          const next = !sfxMuted
          audio.setSfxMuted(next)
          setSfxMuted(next)
        }}
      >
        <AudioLines size={14} strokeWidth={2.25} />
      </button>
    </div>
  )
}

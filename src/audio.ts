// Each file has its own level, from 0 (silent) to 1 (full).
// Mute still silences a whole bus: music, or every effect.

const CLIPS = {
  menu: { src: '/audio/menu.mp3', volume: 0.1 },
  bgm: { src: '/audio/bgm.mp3', volume: 0.1 },
  bite: { src: '/audio/bite.aac', volume: 1.0 },
  collect: { src: '/audio/collect.aac', volume: 0.5 },
  success: { src: '/audio/success.aac', volume: 0.85 },
  fail: { src: '/audio/fail.aac', volume: 0.85 },
} as const

type MusicTrack = 'menu' | 'game'

class AudioManager {
  private menu = new Audio(CLIPS.menu.src)
  private game = new Audio(CLIPS.bgm.src)
  private track: MusicTrack = 'menu'
  private sfxMuted = false
  private bgmMuted = false
  private unlocked = false
  private liveSfx: HTMLAudioElement[] = []
  private lastResultAt = 0

  constructor() {
    this.menu.loop = true
    this.game.loop = true
    this.menu.preload = 'auto'
    this.game.preload = 'auto'
    this.menu.volume = CLIPS.menu.volume
    this.game.volume = CLIPS.bgm.volume
    // Warm the effect files so the first catch does not wait on the network.
    for (const clip of [CLIPS.bite, CLIPS.collect, CLIPS.success, CLIPS.fail]) {
      const audio = new Audio(clip.src)
      audio.preload = 'auto'
    }
  }

  private get active() {
    return this.track === 'menu' ? this.menu : this.game
  }

  get isBgmMuted() {
    return this.bgmMuted
  }

  get isSfxMuted() {
    return this.sfxMuted
  }

  // Browsers block audio until a click or tap. Call this from that gesture.
  startBgm() {
    this.unlocked = true
    if (this.bgmMuted || !this.active.paused) return
    void this.active.play().catch(() => {})
  }

  // Menu music covers title, calculator, and the end screen.
  // Game music covers the countdown and the round itself.
  setTrack(track: MusicTrack) {
    if (this.track === track) return
    this.menu.pause()
    this.game.pause()
    this.track = track
    const current = this.active
    current.currentTime = 0
    current.volume = this.bgmMuted ? 0 : track === 'menu' ? CLIPS.menu.volume : CLIPS.bgm.volume
    if (this.bgmMuted || !this.unlocked) return
    void current.play().catch(() => {})
  }

  setBgmMuted(muted: boolean) {
    this.bgmMuted = muted
    this.menu.volume = muted ? 0 : CLIPS.menu.volume
    this.game.volume = muted ? 0 : CLIPS.bgm.volume
    if (muted) {
      this.menu.pause()
      this.game.pause()
      return
    }
    if (this.unlocked) void this.active.play().catch(() => {})
  }

  setSfxMuted(muted: boolean) {
    this.sfxMuted = muted
    if (!muted) return
    for (const clip of this.liveSfx) clip.pause()
    this.liveSfx = []
  }

  // Bite and collect are separate files, started together so they overlap.
  playCatch() {
    this.playSfx(CLIPS.bite)
    this.playSfx(CLIPS.collect)
  }

  playResult(won: boolean) {
    const now = performance.now()
    if (now - this.lastResultAt < 800) return
    this.lastResultAt = now
    this.playSfx(won ? CLIPS.success : CLIPS.fail)
  }

  private playSfx(sound: { src: string; volume: number }) {
    if (this.sfxMuted) return
    // A new element each time lets the same sound overlap itself.
    const clip = new Audio(sound.src)
    clip.volume = sound.volume
    this.liveSfx.push(clip)
    clip.addEventListener('ended', () => {
      this.liveSfx = this.liveSfx.filter((item) => item !== clip)
    }, { once: true })
    void clip.play().catch(() => {})
  }
}

export const audio = new AudioManager()

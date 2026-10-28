import { useCallback, useEffect, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { audio } from './audio'
import { SoundControls } from './SoundControls'
import { useOfflineTracking } from './useOfflineTracking'
import { copies, languages, localizedImage } from './copy'
import type { Language } from './copy'
import './App.css'

type Screen = 'title' | 'calculator' | 'ready' | 'game' | 'summary'
type Food = { id: number; name: keyof typeof copies.en.foods; image: string; protein: number }
type FallingFood = Food & { x: number; y: number; speed: number }

const STAGE_WIDTH = 1920
const STAGE_HEIGHT = 1080

const GAME_IMAGES = [
  '/background/game.webp',
  '/background/bricks.webp',
  '/misc/bowl.webp',
  '/misc/arrow.webp',
]

// CSS backgrounds and <img> tags are not requested until that screen is on screen.
// Decoding ahead of time puts the bitmap in the browser cache before the swap.
function preload(src: string) {
  const image = new Image()
  image.decoding = 'async'
  image.src = src
  image.decode().catch(() => {})
}

const FOODS: Food[] = [
  { id: 1, name: "Egg", image: "egg2.webp", protein: 7 }, // 3 eggs = ~21g
  { id: 2, name: "Chicken", image: "chicken.webp", protein: 22 }, // 1 palm-sized piece (90g)
  { id: 3, name: "Fish", image: "fish.webp", protein: 22 }, // 1 palm-sized piece (90g)
  { id: 4, name: "Prawn", image: "shrimp.webp", protein: 4 }, // ~1/5th of 5-6 prawns
  { id: 5, name: "Milk", image: "milk.webp", protein: 10 }, // 1 glass (half of 500ml)
  { id: 6, name: "Tofu", image: "tofu.webp", protein: 10 }, // 1 small block (half of 150g)
  { id: 7, name: "Tempeh", image: "tempe2.webp", protein: 16 }, // ~3 slices / small block
  { id: 8, name: "Edamame", image: "edamame.webp", protein: 22 }, // 1 small bowl (200g)
  { id: 9, name: "Beef", image: "beef.webp", protein: 22 }, // 1 palm-sized piece (90g)
  { id: 10, name: "Tuna", image: "tuna.webp", protein: 22 }, // 1 portion (half-can serving)
  { id: 11, name: "Yoghurt", image: "yoghurt.webp", protein: 15 }, // 1 tub Greek yogurt
];

function App() {
  const [language, setLanguage] = useState<Language>('en')
  const copy = copies[language]
  const viewportRef = useRef<HTMLDivElement>(null)
  const [stageScale, setStageScale] = useState(() => Math.min(
    window.innerWidth / STAGE_WIDTH,
    window.innerHeight / STAGE_HEIGHT,
  ))

  useEffect(() => {
    const viewport = viewportRef.current
    if (!viewport) return
    const observer = new ResizeObserver(([entry]) => {
      setStageScale(Math.min(
        entry.contentRect.width / STAGE_WIDTH,
        entry.contentRect.height / STAGE_HEIGHT,
      ))
    })
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const [screen, setScreen] = useState<Screen>('title')
  const [weight, setWeight] = useState('')
  const [overFifty, setOverFifty] = useState(true)
  const [protein, setProtein] = useState(0)
  const [seconds, setSeconds] = useState(15)
  const [caught, setCaught] = useState<Food[]>([])
  const [falling, setFalling] = useState<FallingFood[]>([])
  const [plateX, setPlateX] = useState(50)
  const [showHint, setShowHint] = useState(true)
  const [countdown, setCountdown] = useState(5)
  const gameRef = useRef<HTMLDivElement>(null)
  const plateXRef = useRef(50)
  const fallingRef = useRef<FallingFood[]>([])
  const dragging = useRef(false)
  const nextId = useRef(100)
  const recordResult = useOfflineTracking()
  const roundRef = useRef<{ startedAt: string; startedTick: number; finished: boolean } | null>(null)
  const scoreRef = useRef(0)
  const summaryTimer = useRef<number | undefined>(undefined)
  const target = Math.max(1, Math.round((Number(weight) || 0) * (overFifty ? 1.2 : 0.8)))

  const finishGame = useCallback((score: number) => {
    const round = roundRef.current
    if (!round || round.finished) return
    round.finished = true
    dragging.current = false
    const success = score >= target
    recordResult({
      language,
      weightKg: Number(weight),
      ageGroup: overFifty ? '50 and above' : 'Below 50',
      scoreGrams: score,
      targetGrams: target,
      success,
      elapsedSeconds: Math.round((performance.now() - round.startedTick) / 10) / 100,
      startedAt: round.startedAt,
    })
    if (success) {
      summaryTimer.current = window.setTimeout(() => setScreen('summary'), 550)
    } else {
      setScreen('summary')
    }
  }, [weight, overFifty, target, recordResult, language])

  useEffect(() => () => window.clearTimeout(summaryTimer.current), [])

  const restart = () => {
    setWeight('')
    setScreen('title')
  }

  const startGame = () => {
    roundRef.current = null
    scoreRef.current = 0
    setProtein(0); setCaught([]); setFalling([]); setPlateX(50)
    setSeconds(15); setShowHint(true); setCountdown(5)
    fallingRef.current = []
    plateXRef.current = 50
    dragging.current = false
    setScreen('ready')
  }

  const enterDigit = (digit: string) => {
    if (weight.length >= 3 || (weight === '0' && digit === '0')) return
    setWeight((current) => current === '0' ? digit : current + digit)
  }

  const movePlate = useCallback((clientX: number) => {
    const bounds = gameRef.current?.getBoundingClientRect()
    if (!bounds) return
    const percent = Math.max(9, Math.min(91, ((clientX - bounds.left) / bounds.width) * 100))
    plateXRef.current = percent
    setPlateX(percent)
    setShowHint(false)
  }, [])

  useEffect(() => {
    const images = [...GAME_IMAGES, ...FOODS.map((food) => `/food/${food.image}`)]
    const start = window.setTimeout(() => images.forEach(preload), 0)
    return () => window.clearTimeout(start)
  }, [])

  useEffect(() => {
    if (screen !== 'ready' && screen !== 'game') return
    ;(['end_title', 'restart_button', 'cheatsheet'] as const)
      .forEach((name) => preload(localizedImage(name, language)))
  }, [screen, language])

  useEffect(() => {
    if (screen !== 'ready') return
    const timer = window.setInterval(() => {
      setCountdown((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          setScreen('game')
          return 1
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [screen])

  useEffect(() => {
    if (screen !== 'game') return
    roundRef.current ??= { startedAt: new Date().toISOString(), startedTick: performance.now(), finished: false }
    const timer = window.setInterval(() => {
      const round = roundRef.current
      if (!round || round.finished) return
      const remaining = Math.max(0, 15 - (performance.now() - round.startedTick) / 1000)
      setSeconds(Math.ceil(remaining))
      if (remaining === 0) finishGame(scoreRef.current)
    }, 100)
    return () => window.clearInterval(timer)
  }, [screen, finishGame])

  useEffect(() => {
    if (screen !== 'game') return
    let previous = performance.now()
    let spawnTimer = 0
    let frame = 0
    const tick = (time: number) => {
      if (roundRef.current?.finished) return
      if (roundRef.current && time - roundRef.current.startedTick >= 15000) {
        setSeconds(0)
        finishGame(scoreRef.current)
        return
      }
      const elapsed = time - previous
      const delta = Math.min(elapsed / 16.67, 2)
      previous = time
      spawnTimer += elapsed
      const collected: FallingFood[] = []
      fallingRef.current = fallingRef.current
        .map((item) => ({ ...item, y: item.y + item.speed * delta }))
        .filter((item) => {
          const hit = item.y >= 74 && item.y <= 84 && Math.abs(item.x - plateXRef.current) < 8
          if (hit) collected.push(item)
          return !hit && item.y < 105
        })
      if (collected.length) {
        collected.forEach(() => audio.playCatch())
        const gained = collected.reduce((sum, item) => sum + item.protein, 0)
        setCaught((current) => [...current, ...collected])
        scoreRef.current += gained
        setProtein(scoreRef.current)
        if (scoreRef.current >= target) finishGame(scoreRef.current)
      }
      if (spawnTimer > 1050) {
        spawnTimer = 0
        const food = FOODS[Math.floor(Math.random() * FOODS.length)]
        fallingRef.current.push({
          ...food, id: nextId.current++, x: 10 + Math.random() * 80, y: -12,
          speed: 0.9 + Math.random() * 0.35,
        })
      }
      setFalling([...fallingRef.current])
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [screen, target, finishGame])

  useEffect(() => {
    const menu = screen === 'title' || screen === 'calculator' || screen === 'summary'
    audio.setTrack(menu ? 'menu' : 'game')
  }, [screen])

  useEffect(() => {
    if (screen === 'summary') audio.playResult(protein >= target)
  }, [screen, protein, target])

  const totals = caught.reduce<Record<string, { food: Food; count: number }>>((result, food) => {
    result[food.name] ??= { food, count: 0 }
    result[food.name].count += 1
    return result
  }, {})

  const view = (() => {
  if (screen === 'title') return (
    <main className="gingham-screen title-screen">
      <nav className="language-switcher" aria-label={copy.language}>
        {languages.map(({ code, label }) => (
          <button key={code} type="button" lang={code} aria-pressed={language === code}
            onClick={() => setLanguage(code)}>{label}</button>
        ))}
      </nav>
      <section>
        <h1><span className="windsor">{copy.title}</span></h1>
        <p className="copy-lines">{copy.intro}</p>
        <button className="image-button start-button" aria-label={copy.start} onClick={() => setScreen('calculator')} />
      </section>
      <img className="title-food" src="/misc/title_plate.webp" alt={copy.titleFood} />
    </main>
  )

  if (screen === 'calculator') return (
    <main className="gingham-screen calculator-screen">
      <section className="calculator">
        <header className="calculator-heading">
          <h2>{copy.calculatorTitle}</h2>
        </header>
        <div className="calculator-grid">
          <div className="weight-column">
            <h3><span className="step-number">1</span> {copy.weight} <span className="field-unit">(kg)</span></h3>
            <div className={`weight-display ${weight ? '' : 'placeholder'}`}><strong>{weight || '65'}</strong><span>kg</span></div>
            <div className="numpad">
              {['1','2','3','4','5','6','7','8','9'].map((key) =>
                <button key={key} onClick={() => enterDigit(key)}><span className="windsor">{key}</span></button>)}
              <span />
              <button onClick={() => enterDigit('0')}><span className="windsor">0</span></button>
              <button aria-label={copy.deleteDigit} onClick={() => setWeight((value) => value.slice(0, -1))}><span className="windsor">←</span></button>
            </div>
          </div>
          <div className="age-column">
            <h3><span className="step-number">2</span> {copy.ageGroup}</h3>
            <div className="age-options">
              <label><input type="radio" checked={overFifty} onChange={() => setOverFifty(true)} /> <span>{copy.older}</span></label>
              <label><input type="radio" checked={!overFifty} onChange={() => setOverFifty(false)} /> <span>{copy.younger}</span></label>
            </div>
            <div className="protein-goal" aria-live="polite">
              <p className="calculation">{copy.calculation
                .replace('{weight}', weight || '—')
                .replace('{rate}', overFifty ? '1.2' : '0.8')
                .replace('{target}', weight ? String(target) : '—')}</p>
            </div>
            <p className="tip">{copy.ageExplanation}</p>
            <div className="calculator-actions">
              <button className="image-button calculator-start" aria-label={copy.startGame} disabled={!weight || Number(weight) === 0} onClick={startGame} />
            </div>
          </div>
        </div>
      </section>
    </main>
  )

  if (screen === 'ready') return (
    <main className="ready-screen">
      <section className="instructions">
        <p><b>1</b> {copy.dragInstruction}</p>
        <p><b>2</b> {copy.collectBefore} <strong><span className="windsor">{target}{copy.gram}</span></strong> {copy.collectAfter}</p>
        <h1><span className="windsor">{countdown}</span></h1>
      </section>
    </main>
  )

  if (screen === 'summary') {
    const won = protein >= target
    return (
      <main className="summary-screen">
        <section className="result-panel">
          <h1 className={won ? 'win' : 'lose'}><span className="windsor">{won ? copy.winTitle : copy.loseTitle}</span></h1>
          <h2 className={won ? 'win' : 'lose'}>{won ? copy.winMessage : copy.loseMessage}</h2>
          <p>{won ? copy.winDailyGoal : copy.dailyGoal}: <strong>{target}{copy.gram}</strong><br />{won ? copy.winEatenToday : copy.eatenToday}: <strong className={won ? 'eaten' : 'short'}>{protein}{copy.gram}</strong></p>
          <div className="eaten-list">
            {Object.values(totals).map(({ food, count }) => <div key={food.name}><span>{copy.foods[food.name]}{count > 1 ? ` x${count}` : ''}</span><i /><b>{food.protein * count}{copy.gram}</b></div>)}
          </div>
          <div className="result-actions">
            <button aria-label={copy.restart} onClick={restart} />
            <div className="qr-guide">
              <div className="qr-code">
                <img src="/qr/qrcode.png" alt={copy.qr} />
                <span className="qr-url">https://for.sg/eatbetter</span>
              </div>
              <span className="copy-lines">{copy.healthyTips}</span>
            </div>
          </div>
        </section>
        <section className="cheatsheet-panel">
          <img className="end-title" src={localizedImage('end_title', language)} alt={copy.endTitle} />
          <img className="cheatsheet-grid" src={localizedImage('cheatsheet', language)} alt={copy.cheatsheet} />
        </section>
      </main>
    )
  }

  return (
    <main className="game-screen" ref={gameRef}
      onDragStart={(event) => event.preventDefault()}
      onPointerMove={(event) => dragging.current && movePlate(event.clientX)}
      onPointerUp={() => { dragging.current = false }}
      onPointerCancel={() => { dragging.current = false }}>
      <p className="game-instruction copy-lines">{copy.gameInstruction}</p>
      <div className={`timer ${seconds <= 5 ? 'ending' : ''}`}>00:{String(seconds).padStart(2, '0')}</div>
      <div className="protein-meter" aria-label={copy.proteinMeter.replace('{protein}', String(protein)).replace('{target}', String(target))}>
        <span>{target}{copy.gram}</span><div><i style={{ height: `${Math.min((protein / target) * 100, 100)}%` }}><b>{protein}</b></i></div>
      </div>
      <section className="play-field">
        {falling.map((food) => <div className="falling-food" key={food.id}
          style={{ left: `${food.x}%`, top: `${food.y}%` }}>
          <img src={`/food/${food.image}`} alt={copy.foods[food.name]} draggable={false} />
        </div>)}
        <div className="plate-control" style={{ left: `${plateX}%` }}
          onDragStart={(event) => event.preventDefault()}
          onPointerDown={(event) => {
            event.preventDefault()
            dragging.current = true
            event.currentTarget.setPointerCapture(event.pointerId)
            movePlate(event.clientX)
          }}
          role="slider" aria-label={copy.platePosition} aria-valuenow={Math.round(plateX)} tabIndex={0}
          onKeyDown={(event) => {
            const bounds = gameRef.current?.getBoundingClientRect()
            if (!bounds) return
            if (event.key === 'ArrowLeft') movePlate(bounds.left + ((plateX - 5) / 100) * bounds.width)
            if (event.key === 'ArrowRight') movePlate(bounds.left + ((plateX + 5) / 100) * bounds.width)
          }}>
          <div className="plate-stack">
            {caught.slice(-6).map((food, index) => (
              <span key={`${food.id}-${index}`} style={{
                left: `${50 + (index - 2.5) * 12}%`,
                transform: `translateX(-50%) rotate(${(index - 2.5) * 5}deg)`,
              }}><img src={`/food/${food.image}`} alt="" draggable={false} /></span>
            ))}
          </div>
          <img className="bowl" src="/misc/bowl.webp" alt={copy.bowl} draggable={false} />
        </div>
        <div className={`drag-arrows ${showHint ? '' : 'hidden'}`}>
          <img className="drag-arrow left" src="/misc/arrow.webp" alt="" draggable={false} />
          <img className="drag-arrow" src="/misc/arrow.webp" alt={copy.dragHint} draggable={false} />
        </div>
      </section>
    </main>
  )
  })()

  return (
    <div className={`app-viewport ${screen === 'title' || screen === 'calculator' ? 'menu-viewport' : 'game-viewport'}`} ref={viewportRef}
      lang={language}
      style={{ '--stage-scale': stageScale,
        '--start-button': `url("${localizedImage('start_button', language)}")`,
        '--restart-button': `url("${localizedImage('restart_button', language)}")`,
      } as CSSProperties}>
      <div className={`viewport-scenery scenery-${screen}`} aria-hidden="true">
        {(screen === 'ready' || screen === 'game' || screen === 'summary') && <div className="scene-bricks" />}
        {(screen === 'ready' || screen === 'summary') && <div className="scene-blur" />}
        {screen === 'summary' && <div className="scene-wash" />}
      </div>
      {screen === 'summary' && <div className="result-gingham" aria-hidden="true" />}
      <div className="app-stage" style={{ transform: `translate(-50%, -50%) scale(${stageScale})` }}>
        <SoundControls copy={copy} />
        {view}
      </div>
    </div>
  )
}

export default App

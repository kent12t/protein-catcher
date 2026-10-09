import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

type Screen = 'title' | 'calculator' | 'ready' | 'game' | 'summary'
type Food = { id: number; name: string; image: string; protein: number }
type FallingFood = Food & { x: number; y: number; speed: number }

const GAME_IMAGES = [
  '/background/game.webp',
  '/background/bricks.webp',
  '/misc/bowl.webp',
  '/misc/arrow.webp',
]

const SUMMARY_IMAGES = [
  '/background/end_screen.webp',
  '/misc/end_title.webp',
  '/misc/restart_button.webp',
  ...Array.from({ length: 12 }, (_, index) => `/cheatsheet/cheatsheet_${index + 1}.webp`),
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
  const target = Math.max(1, Math.round((Number(weight) || 0) * (overFifty ? 1.2 : 0.8)))

  const restart = () => {
    setWeight('')
    setScreen('title')
  }

  const startGame = () => {
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
    SUMMARY_IMAGES.forEach(preload)
  }, [screen])

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
    const timer = window.setInterval(() => {
      setSeconds((current) => {
        if (current <= 1) {
          window.clearInterval(timer)
          setScreen('summary')
          return 0
        }
        return current - 1
      })
    }, 1000)
    return () => window.clearInterval(timer)
  }, [screen])

  useEffect(() => {
    if (screen !== 'game') return
    let previous = performance.now()
    let spawnTimer = 0
    let frame = 0
    const tick = (time: number) => {
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
        const gained = collected.reduce((sum, item) => sum + item.protein, 0)
        setCaught((current) => [...current, ...collected])
        setProtein((current) => {
          const next = current + gained
          if (next >= target) {
            dragging.current = false
            window.setTimeout(() => setScreen('summary'), 550)
          }
          return next
        })
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
  }, [screen, target])

  const totals = caught.reduce<Record<string, { food: Food; count: number }>>((result, food) => {
    result[food.name] ??= { food, count: 0 }
    result[food.name].count += 1
    return result
  }, {})

  if (screen === 'title') return (
    <main className="gingham-screen title-screen">
      <section>
        <h1><span className="windsor">PROTEIN MUNCHER</span></h1>
        <p>Do you know how much<br />protein you need in a day?</p>
        <button className="image-button start-button" aria-label="Start" onClick={() => setScreen('calculator')} />
      </section>
      <img className="title-food" src="/misc/title_plate.webp" alt="A plate of protein-rich foods" />
    </main>
  )

  if (screen === 'calculator') return (
    <main className="gingham-screen calculator-screen">
      <section className="calculator">
        <h2>Enter your weight and select your age group<br />to get your daily protein intake</h2>
        <div className="calculator-grid">
          <div className="weight-column">
            <label>Weight</label>
            <div className={`weight-display ${weight ? '' : 'placeholder'}`}><strong>{weight || '65'}</strong><span>kg</span></div>
            <div className="numpad">
              {['1','2','3','4','5','6','7','8','9'].map((key) =>
                <button key={key} onClick={() => enterDigit(key)}><span className="windsor">{key}</span></button>)}
              <span />
              <button onClick={() => enterDigit('0')}><span className="windsor">0</span></button>
              <button aria-label="Delete last digit" onClick={() => setWeight((value) => value.slice(0, -1))}><span className="windsor">←</span></button>
            </div>
          </div>
          <div className="age-column">
            <h3>Age group:</h3><p>(Select your age group)</p>
            <div className="age-options">
              <label><input type="radio" checked={overFifty} onChange={() => setOverFifty(true)} /> <span>&gt;50 years old</span></label>
              <label><input type="radio" checked={!overFifty} onChange={() => setOverFifty(false)} /> <span>&lt;50 years old</span></label>
            </div>
            <p className="calculation">You will need <b>{weight || '—'}</b> kg x <b className="orange">{overFifty ? '1.2' : '0.8'}</b> g = <strong>{weight ? target : '—'}</strong> g of protein</p>
            <p className="tip"><b>Pro tip:</b><br />If you’re 50 and above, you’ll need an estimated 1.2g of protein per kg of body weight daily.<br />If you’re below 50, an estimated 0.8g per kg daily is enough.</p>
          </div>
        </div>
        <button className="image-button calculator-start" aria-label="Start game" disabled={!weight} onClick={startGame} />
      </section>
    </main>
  )

  if (screen === 'ready') return (
    <main className="ready-screen">
      <div className="scene-bricks" />
      <div className="scene-blur" />
      <section className="instructions">
        <p><b>1</b> Hold and drag the plate left and right</p>
        <p><b>2</b> Collect <strong><span className="windsor">{target}g</span></strong> of protein in 15 seconds</p>
        <h1><span className="windsor">{countdown}</span></h1>
      </section>
    </main>
  )

  if (screen === 'summary') {
    const won = protein >= target
    return (
      <main className="summary-screen">
        <div className="scene-bricks" />
        <div className="scene-blur" />
        <div className="scene-wash" />
        <img className="end-screen" src="/background/end_screen.webp" alt="" />
        <section className="result-panel">
          <h1 className={won ? 'win' : 'lose'}><span className="windsor">{won ? 'GOOD JOB!' : 'OH NO!'}</span></h1>
          <h2 className={won ? 'win' : 'lose'}>{won ? 'You ate enough protein today!' : "You didn’t eat enough protein today!"}</h2>
          <p>Your daily protein goal: <strong>{target}g</strong><br />Protein eaten today: <strong className={won ? 'eaten' : 'short'}>{protein}g</strong></p>
          <div className="eaten-list">
            {Object.values(totals).map(({ food, count }) => <div key={food.name}><span>{food.name}{count > 1 ? ` x${count}` : ''}</span><i /><b>{food.protein * count}g</b></div>)}
          </div>
          <div className="result-actions">
            <button aria-label="Restart" onClick={restart} />
            <a href="https://www.healthhub.sg/well-being-and-lifestyle/active-ageing/seniors-need-more-protein" target="_blank" rel="noreferrer">
              <img src="/qr/qrcode.svg" alt="HealthHub protein guide QR code" /><span>Tips on Healthier<br />Eating Habits</span>
            </a>
          </div>
        </section>
        <section className="cheatsheet-panel">
          <img className="end-title" src="/misc/end_title.webp" alt="Mix and match to meet your daily protein goal" />
          <div className="cheatsheet-grid">{Array.from({ length: 12 }, (_, index) => <img key={index} src={`/cheatsheet/cheatsheet_${index + 1}.webp`} alt="" />)}</div>
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
      <p className="game-instruction">Catch protein-rich foods by dragging<br />the plate to meet your daily goal!</p>
      <div className={`timer ${seconds <= 5 ? 'ending' : ''}`}>00:{String(seconds).padStart(2, '0')}</div>
      <div className="protein-meter" aria-label={`${protein} of ${target} grams of protein`}>
        <span>{target}g</span><div><i style={{ height: `${Math.min((protein / target) * 100, 100)}%` }}><b>{protein}</b></i></div>
      </div>
      <section className="play-field">
        {falling.map((food) => <div className="falling-food" key={food.id}
          style={{ left: `${food.x}%`, top: `${food.y}%` }}>
          <img src={`/food/${food.image}`} alt={food.name} draggable={false} />
        </div>)}
        <div className="plate-control" style={{ left: `${plateX}%` }}
          onDragStart={(event) => event.preventDefault()}
          onPointerDown={(event) => {
            event.preventDefault()
            dragging.current = true
            event.currentTarget.setPointerCapture(event.pointerId)
            movePlate(event.clientX)
          }}
          role="slider" aria-label="Plate position" aria-valuenow={Math.round(plateX)} tabIndex={0}
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
          <img className="bowl" src="/misc/bowl.webp" alt="Bowl" draggable={false} />
        </div>
        <div className={`drag-arrows ${showHint ? '' : 'hidden'}`}>
          <img className="drag-arrow left" src="/misc/arrow.webp" alt="" draggable={false} />
          <img className="drag-arrow" src="/misc/arrow.webp" alt="Drag left and right" draggable={false} />
        </div>
      </section>
    </main>
  )
}

export default App

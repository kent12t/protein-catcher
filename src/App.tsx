import { useCallback, useEffect, useRef, useState } from 'react'
import './App.css'

type Screen = 'start' | 'game' | 'summary'
type Food = { id: number; name: string; emoji: string; protein: number; serving: string; color: string }
type FallingFood = Food & { x: number; y: number; speed: number }

const TARGET = 75
const FOODS: Food[] = [
  { id: 1, name: 'Egg', emoji: '🥚', protein: 7, serving: '1 large egg', color: '#fff0c7' },
  { id: 2, name: 'Firm tofu', emoji: '◻️', protein: 10, serving: '75 g', color: '#e6f1d0' },
  { id: 3, name: 'Chicken', emoji: '🍗', protein: 22, serving: '90 g, palm-sized', color: '#ffd2ac' },
  { id: 4, name: 'Fish', emoji: '🐟', protein: 20, serving: '90 g, palm-sized', color: '#cce9f2' },
  { id: 5, name: 'Soya milk', emoji: '🥛', protein: 10, serving: '250 ml glass', color: '#e5dcf6' },
  { id: 6, name: 'Tempeh', emoji: '🫘', protein: 12, serving: '60 g', color: '#f0d6aa' },
]
const PALM_GUIDE = [
  { emoji: '🍗', title: 'Lean meat, fish or poultry', amount: '1 palm (90 g)', protein: '20–25 g' },
  { emoji: '🥚', title: 'Eggs', amount: '3 eggs (150 g)', protein: '20–25 g' },
  { emoji: '◻️', title: 'Firm tofu', amount: '2 small blocks (150 g)', protein: '20–25 g' },
  { emoji: '🥛', title: 'Low-fat or soya milk', amount: '2 glasses (500 ml)', protein: '20–25 g' },
]

function App() {
  const [screen, setScreen] = useState<Screen>('start')
  const [protein, setProtein] = useState(0)
  const [caught, setCaught] = useState<Food[]>([])
  const [falling, setFalling] = useState<FallingFood[]>([])
  const [plateX, setPlateX] = useState(50)
  const [flash, setFlash] = useState('')
  const gameRef = useRef<HTMLDivElement>(null)
  const plateXRef = useRef(50)
  const dragging = useRef(false)
  const nextId = useRef(100)

  const startGame = () => {
    setProtein(0); setCaught([]); setFalling([]); setPlateX(50)
    plateXRef.current = 50
    setScreen('game')
  }

  const movePlate = useCallback((clientX: number) => {
    const bounds = gameRef.current?.getBoundingClientRect()
    if (!bounds) return
    const percent = Math.max(9, Math.min(91, ((clientX - bounds.left) / bounds.width) * 100))
    plateXRef.current = percent
    setPlateX(percent)
  }, [])

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
      setFalling((items) => {
        let updated = items.map((item) => ({ ...item, y: item.y + item.speed * delta }))
        const collected: FallingFood[] = []
        updated = updated.filter((item) => {
          const hit = item.y >= 70 && item.y <= 88 && Math.abs(item.x - plateXRef.current) < 12
          if (hit) collected.push(item)
          return !hit && item.y < 105
        })
        if (collected.length) {
          const gained = collected.reduce((sum, item) => sum + item.protein, 0)
          setCaught((current) => [...current, ...collected])
          setFlash(`+${gained} g`)
          window.setTimeout(() => setFlash(''), 700)
          setProtein((current) => {
            const next = current + gained
            if (next >= TARGET) window.setTimeout(() => setScreen('summary'), 550)
            return next
          })
        }
        return updated
      })
      if (spawnTimer > 1050) {
        spawnTimer = 0
        const food = FOODS[Math.floor(Math.random() * FOODS.length)]
        setFalling((items) => [...items, {
          ...food, id: nextId.current++, x: 10 + Math.random() * 80, y: -12,
          speed: 0.48 + Math.random() * 0.2,
        }])
      }
      frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [screen])

  const totals = caught.reduce<Record<string, { food: Food; count: number }>>((result, food) => {
    result[food.name] ??= { food, count: 0 }
    result[food.name].count += 1
    return result
  }, {})

  if (screen === 'start') return (
    <main className="start-screen">
      <div className="leaf leaf-one" /><div className="leaf leaf-two" />
      <section className="intro-card">
        <div className="eyebrow">A healthy ageing mini-game</div>
        <div className="hero-icon" aria-hidden="true">💪</div>
        <h1>Catch your daily strength</h1>
        <p className="lead">Protein helps maintain muscles, movement and independence as we age.</p>
        <div className="target-card"><span className="target-number">75 g</span><span>today’s protein goal</span></div>
        <p className="explain">Adults aged 50 and above need about <strong>1.2 g per kg of body weight</strong>. That works out to 75 g for a 62.5 kg adult.</p>
        <button className="primary-button" onClick={startGame}>Let’s start <span>→</span></button>
        <a className="source-link" href="https://www.healthhub.sg/well-being-and-lifestyle/active-ageing/seniors-need-more-protein" target="_blank" rel="noreferrer">Learn more from HealthHub ↗</a>
      </section>
    </main>
  )

  if (screen === 'summary') return (
    <main className="summary-screen">
      <header className="summary-header">
        <div><div className="eyebrow light">Daily goal complete</div><h1>Wonderful catch!</h1><p>You collected <strong>{protein} g of protein</strong> today.</p></div>
        <div className="goal-ring"><strong>{protein}</strong><span>grams</span></div>
      </header>
      <div className="summary-grid">
        <section className="panel eaten-panel">
          <h2>What you caught</h2><p className="muted">A playful estimate based on standard servings.</p>
          <div className="meal-list">
            {Object.values(totals).map(({ food, count }) => (
              <div className="meal-row" key={food.name}>
                <span className="mini-food" style={{ background: food.color }}>{food.emoji}</span>
                <span><strong>{food.name}</strong><small>{count} × {food.serving}</small></span><b>{food.protein * count} g</b>
              </div>
            ))}
          </div>
        </section>
        <section className="panel guide-panel">
          <h2>What does 20–25 g look like?</h2><p className="muted">Simple serving examples from HealthHub.</p>
          <div className="guide-grid">
            {PALM_GUIDE.map((item) => <article key={item.title}>
              <span className="guide-emoji">{item.emoji}</span>
              <div><strong>{item.title}</strong><small>{item.amount}</small></div><b>{item.protein}</b>
            </article>)}
          </div>
        </section>
      </div>
      <footer className="summary-actions">
        <p>Aim to spread protein across 3 meals — about <strong>25 g each meal</strong>.</p>
        <button className="primary-button" onClick={startGame}>Play again ↻</button>
      </footer>
    </main>
  )

  return (
    <main className="game-screen" ref={gameRef}
      onPointerMove={(event) => dragging.current && movePlate(event.clientX)}
      onPointerUp={() => { dragging.current = false }}
      onPointerCancel={() => { dragging.current = false }}>
      <header className="game-header">
        <div><span className="game-mark">P</span><strong>Protein Plate</strong></div>
        <p>Move the plate. Catch nourishing foods.</p>
        <button onClick={() => setScreen('start')} aria-label="Exit game">×</button>
      </header>
      <div className="progress-wrap" aria-label={`${Math.min(protein, TARGET)} of ${TARGET} grams of protein`}>
        <div className="progress-copy"><strong>{Math.min(protein, TARGET)} g collected</strong><span>Goal: {TARGET} g</span></div>
        <div className="progress-track"><div style={{ width: `${Math.min((protein / TARGET) * 100, 100)}%` }} /></div>
      </div>
      <section className="play-field">
        <div className="cloud cloud-a">☁</div><div className="cloud cloud-b">☁</div>
        {falling.map((food) => <div className="falling-food" key={food.id}
          style={{ left: `${food.x}%`, top: `${food.y}%`, background: food.color }}>
          <span>{food.emoji}</span><small>+{food.protein} g</small>
        </div>)}
        <div className={`catch-flash ${flash ? 'show' : ''}`} style={{ left: `${plateX}%` }}>{flash}</div>
        <div className="plate-control" style={{ left: `${plateX}%` }}
          onPointerDown={(event) => {
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
          <div className="plate-food">🥗</div><div className="plate-rim" /><span className="drag-hint">↔ drag me</span>
        </div>
      </section>
    </main>
  )
}

export default App

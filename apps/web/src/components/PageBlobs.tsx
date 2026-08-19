/**
 * PageBlobs — animation 100% JavaScript via requestAnimationFrame.
 * Aucune animation CSS. Bords doux par filter:blur. Z-index < sidebar/header.
 */
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'

interface BlobDef {
  r: number; g: number; b: number
  size:      number   // px
  peakAlpha: number   // opacité max
  cycleSecs: number   // secondes entre téléportations
  driftAmp:  number   // amplitude dérive px
  freq:      number   // fréquence de base (rad/ms) — très basse pour fluidité
  blur:      number   // filter:blur px
  phaseOff:  number   // décalage de phase (rad)
  xMin: number; xMax: number  // zone de téléportation (fraction viewport)
  yMin: number; yMax: number
}

const DEFS: BlobDef[] = [
  { r:196, g:144, b:124, size:700, peakAlpha:0.80, cycleSecs:22, driftAmp:260, freq:0.000150, blur:75,  phaseOff:0,    xMin:-0.10, xMax:0.55, yMin:-0.15, yMax:0.55 },
  { r:139, g:123, b:171, size:580, peakAlpha:0.72, cycleSecs:26, driftAmp:220, freq:0.000120, blur:65,  phaseOff:1.57, xMin:-0.10, xMax:0.40, yMin:0.20,  yMax:0.85 },
  { r:201, g:147, b:58,  size:500, peakAlpha:0.68, cycleSecs:24, driftAmp:280, freq:0.000170, blur:55,  phaseOff:3.14, xMin:0.40,  xMax:0.92, yMin:0.35,  yMax:0.92 },
  { r:107, g:143, b:113, size:420, peakAlpha:0.65, cycleSecs:30, driftAmp:200, freq:0.000135, blur:60,  phaseOff:4.71, xMin:0.15,  xMax:0.80, yMin:0.05,  yMax:0.72 },
]

function Blob({ def, startDelay }: { def: BlobDef; startDelay: number }) {
  const elRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = elRef.current
    if (!el) return

    // Position de base (centre du blob en px)
    const rndPos = () => ({
      bx: (def.xMin + Math.random() * (def.xMax - def.xMin)) * window.innerWidth,
      by: (def.yMin + Math.random() * (def.yMax - def.yMin)) * window.innerHeight,
    })

    let { bx, by } = rndPos()
    let t       = startDelay
    let opacity = 0
    let holdMs  = def.cycleSecs * 1000
    let phase: 'in' | 'hold' | 'out' = 'in'
    const FADE  = 1400   // ms pour un fade in/out

    let last: number | null = null
    let rafId: number

    // Fonction fléchée (et non déclaration hoistée) : conserve le narrowing de `el`.
    const frame = (now: number) => {
      if (last === null) last = now
      const dt = Math.min(now - last, 50)
      last = now
      t += dt

      // ── Opacité ──────────────────────────────────────────────
      if (phase === 'in') {
        opacity += (def.peakAlpha / FADE) * dt
        if (opacity >= def.peakAlpha) { opacity = def.peakAlpha; phase = 'hold' }
      } else if (phase === 'hold') {
        holdMs -= dt
        if (holdMs <= 0) phase = 'out'
      } else {
        opacity -= (def.peakAlpha / FADE) * dt
        if (opacity <= 0) {
          opacity = 0
          const p = rndPos(); bx = p.bx; by = p.by   // téléport invisible
          phase = 'in'
          holdMs = def.cycleSecs * 1000 * (0.8 + Math.random() * 0.4)
        }
      }

      // ── Dérive fluide (3 sinusoïdes déphasées en X, 3 en Y) ──
      const f  = def.freq
      const po = def.phaseOff
      const A  = def.driftAmp
      const dx =  A       * Math.sin(t * f        + po)
               +  A * 0.5 * Math.cos(t * f * 0.57 + po + 1.2)
               +  A * 0.3 * Math.sin(t * f * 1.31 + po + 2.8)
      const dy =  A       * Math.cos(t * f * 0.83  + po + 0.7)
               +  A * 0.45 * Math.sin(t * f * 0.61 + po + 1.9)
               +  A * 0.25 * Math.cos(t * f * 1.17 + po + 3.5)

      // ── Morph border-radius (8 valeurs indépendantes) ─────────
      const m   = f * 0.8
      const s   = (f2: number, off: number, amp: number) =>
        Math.round(50 + amp * Math.sin(t * f2 + off))
      const r   = [
        s(m * 1.1, po,        18), s(m * 0.9, po + 0.8,  16),
        s(m * 0.7, po + 1.6,  20), s(m * 1.3, po + 2.4,  14),
        s(m * 0.85,po + 0.4,  15), s(m * 1.2, po + 1.2,  17),
        s(m * 0.65,po + 2.0,  19), s(m * 1.05,po + 2.8,  13),
      ]
      const br = `${r[0]}% ${r[1]}% ${r[2]}% ${r[3]}% / ${r[4]}% ${r[5]}% ${r[6]}% ${r[7]}%`

      // ── Application DOM ───────────────────────────────────────
      const x = bx + dx - def.size * 0.3
      const y = by + dy - def.size * 0.3
      el.style.transform    = `translate(${x.toFixed(1)}px,${y.toFixed(1)}px)`
      el.style.borderRadius = br
      el.style.opacity      = opacity.toFixed(3)

      rafId = requestAnimationFrame(frame)
    }

    rafId = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(rafId)
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps

  const grad = `radial-gradient(ellipse 60% 55% at 40% 40%,
    rgba(${def.r},${def.g},${def.b},1)    0%,
    rgba(${def.r},${def.g},${def.b},0.55) 45%,
    rgba(${def.r},${def.g},${def.b},0.10) 72%,
    transparent 88%)`

  return (
    <div
      ref={elRef}
      style={{
        position:      'fixed',
        left:          0,
        top:           0,
        width:         def.size,
        height:        def.size,
        background:    grad,
        filter:        `blur(${def.blur}px)`,
        pointerEvents: 'none',
        opacity:       0,
        zIndex:        0,
        willChange:    'transform, border-radius, opacity',
      }}
    />
  )
}

export function PageBlobs() {
  return createPortal(
    <div style={{ position:'fixed', inset:0, pointerEvents:'none', zIndex:0, overflow:'hidden' }}>
      {DEFS.map((def, i) => <Blob key={i} def={def} startDelay={i * 3500} />)}
    </div>,
    document.body
  )
}

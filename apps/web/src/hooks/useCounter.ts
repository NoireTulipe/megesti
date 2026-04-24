import { useState, useEffect } from 'react'

export function useCounter(target: number, duration = 900, delay = 0): number {
  const [val, setVal] = useState(0)

  useEffect(() => {
    let start: number | null = null
    let raf: number

    const timeout = setTimeout(() => {
      const step = (ts: number) => {
        if (!start) start = ts
        const progress = Math.min((ts - start) / duration, 1)
        const eased = 1 - Math.pow(1 - progress, 3)
        setVal(Math.round(eased * target))
        if (progress < 1) raf = requestAnimationFrame(step)
      }
      raf = requestAnimationFrame(step)
    }, delay)

    return () => {
      clearTimeout(timeout)
      cancelAnimationFrame(raf)
    }
  }, [target, duration, delay])

  return val
}

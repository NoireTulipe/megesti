import { createContext, useContext, useState } from 'react'

interface HelpCtx { showHelp: boolean; toggleHelp: () => void }

const HelpContext = createContext<HelpCtx>({ showHelp: true, toggleHelp: () => {} })

export function HelpProvider({ children }: { children: React.ReactNode }) {
  const [showHelp, setShowHelp] = useState(true)
  return (
    <HelpContext.Provider value={{ showHelp, toggleHelp: () => setShowHelp(v => !v) }}>
      {children}
    </HelpContext.Provider>
  )
}

export function useHelp() {
  return useContext(HelpContext)
}

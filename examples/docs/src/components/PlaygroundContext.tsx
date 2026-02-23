import { createContext, useContext, useRef, type RefObject } from 'react'

const PlaygroundContext = createContext<RefObject<HTMLDivElement | null> | null>(null)

export function PlaygroundProvider({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement | null>(null)
  return (
    <PlaygroundContext.Provider value={ref}>
      {children}
    </PlaygroundContext.Provider>
  )
}

export function usePlaygroundPortal() {
  return useContext(PlaygroundContext)
}

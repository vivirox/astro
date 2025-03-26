import React, { createContext, useContext } from 'react'
import { SimulatorContext, SimulatorProviderProps } from '../types'
import { useSimulator } from '../hooks/useSimulator'

// Create the simulator context
const SimulatorContext = createContext<SimulatorContext | undefined>(undefined)

/**
 * Provider component for simulator functionality
 * Makes simulator state and functions available to all children
 */
export function SimulatorProvider({ children }: SimulatorProviderProps) {
  // Use the simulator hook to get all functionality
  const simulatorState = useSimulator()

  return (
    <SimulatorContext.Provider value={simulatorState}>
      {children}
    </SimulatorContext.Provider>
  )
}

/**
 * Hook to use the simulator context
 * Provides access to all simulator functionality
 */
export function useSimulatorContext(): SimulatorContext {
  const context = useContext(SimulatorContext)

  if (context === undefined) {
    throw new Error(
      'useSimulatorContext must be used within a SimulatorProvider',
    )
  }

  return context
}

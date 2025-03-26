import { render, screen, fireEvent } from '@testing-library/react'
import { SimulatorDashboard } from '../SimulatorDashboard'
import { vi } from 'vitest'

// Mock the simulator hooks and components
vi.mock('@/simulator', () => ({
  SimulatorProvider: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SimulationContainer: ({ scenarioId }: { scenarioId: string }) => (
    <div data-testid="simulation-container">Simulation: {scenarioId}</div>
  ),
  ScenarioSelector: ({ onSelect }: { onSelect: (id: string) => void }) => (
    <button onClick={() => onSelect('test-scenario')}>Select Scenario</button>
  ),
  useAnonymizedMetrics: () => ({
    metrics: { completedScenarios: 0, averageScore: 0 },
    loading: false
  })
}))

describe('SimulatorDashboard', () => {
  it('renders scenario selector by default', () => {
    render(<SimulatorDashboard />)
    expect(screen.getByText(/Select a Practice Scenario/i)).toBeInTheDocument()
  })

  it('switches to simulation view when scenario selected', () => {
    render(<SimulatorDashboard />)
    fireEvent.click(screen.getByText('Select Scenario'))
    expect(screen.getByTestId('simulation-container')).toBeInTheDocument()
  })

  it('shows metrics dialog when metrics button clicked', () => {
    render(<SimulatorDashboard />)
    fireEvent.click(screen.getByText(/Progress Metrics/i))
    expect(screen.getByRole('dialog')).toBeInTheDocument()
  })

  it('returns to scenario selection when back button clicked', () => {
    render(<SimulatorDashboard />)
    // First select a scenario
    fireEvent.click(screen.getByText('Select Scenario'))
    // Then go back
    fireEvent.click(screen.getByText(/Back to Scenarios/i))
    expect(screen.getByText(/Select a Practice Scenario/i)).toBeInTheDocument()
  })
})
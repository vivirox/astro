import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import * as fs from 'fs'
import * as path from 'path'
import { compileAstroComponent } from '../../../test-utils/astro-test-utils'

// Mock the monitoring config
vi.mock('../../../lib/monitoring/config', () => ({
  getMonitoringConfig: () => ({
    grafana: {
      enableRUM: true,
      rumSamplingRate: 0.5,
      url: 'https://test.grafana.com',
      apiKey: 'test-key',
      orgId: 'test-org',
      rumApplicationName: 'test-app',
    },
    metrics: {
      enablePerformanceMetrics: true,
      slowRequestThreshold: 500,
      errorRateThreshold: 0.01,
      resourceUtilizationThreshold: 0.8,
    },
    alerts: {
      enableAlerts: true,
    },
  }),
}))

// Compile the Astro component to React
const componentPath = path.resolve(__dirname, '../RealUserMonitoring.astro')
const RealUserMonitoringComponent = compileAstroComponent(componentPath)

describe('RealUserMonitoring.astro', () => {
  // Mock window and performance objects
  beforeEach(() => {
    // Mock the document object methods
    Object.defineProperty(global.document, 'getElementById', {
      value: vi.fn().mockImplementation((id) => {
        const element = {
          querySelectorAll: vi.fn().mockReturnValue([
            {
              querySelector: vi.fn().mockReturnValue({
                textContent: '',
                classList: {
                  remove: vi.fn(),
                },
                className: '',
              }),
            },
          ]),
          addEventListener: vi.fn(),
          textContent: '',
        }
        return element
      }),
      configurable: true,
    })

    // Mock localStorage
    Object.defineProperty(global, 'localStorage', {
      value: {
        getItem: vi.fn(),
        setItem: vi.fn(),
      },
      configurable: true,
    })

    // Mock performance API
    Object.defineProperty(global, 'performance', {
      value: {
        getEntriesByType: vi.fn().mockReturnValue([]),
        now: vi.fn().mockReturnValue(1000),
      },
      configurable: true,
    })

    // Mock interval
    vi.useFakeTimers()
  })

  it('renders with default props', () => {
    render(<RealUserMonitoringComponent />)
    
    // Check that the component renders with default title
    expect(screen.getByText('Real User Monitoring')).toBeInTheDocument()
    
    // Check for main sections
    expect(screen.getByText('Loading Performance')).toBeInTheDocument()
    expect(screen.getByText('Interactivity')).toBeInTheDocument()
    expect(screen.getByText('Visual Stability')).toBeInTheDocument()
    expect(screen.getByText('User Demographics')).toBeInTheDocument()
    expect(screen.getByText('Resource Metrics')).toBeInTheDocument()
    expect(screen.getByText('Error Rates')).toBeInTheDocument()
    
    // Check for refresh button
    expect(screen.getByText('Refresh Now')).toBeInTheDocument()
  })

  it('renders with custom props', () => {
    const customTitle = 'Custom RUM Dashboard'
    const customDescription = 'Test description'
    
    render(
      <RealUserMonitoringComponent
        title={customTitle}
        description={customDescription}
        refreshInterval={60000}
      />
    )
    
    expect(screen.getByText(customTitle)).toBeInTheDocument()
    expect(screen.getByText(customDescription)).toBeInTheDocument()
  })

  it('starts with loading placeholders', () => {
    render(<RealUserMonitoringComponent />)
    
    // There should be loading placeholders initially
    const loadingElements = screen.getAllByText('Loading...')
    expect(loadingElements.length).toBeGreaterThan(0)
  })

  it('shows last updated text', () => {
    render(<RealUserMonitoringComponent />)
    
    expect(screen.getByText('Last updated: Never')).toBeInTheDocument()
  })
}) 
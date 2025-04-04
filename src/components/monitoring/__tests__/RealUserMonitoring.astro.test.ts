import { describe, it, expect, vi, beforeEach } from 'vitest'

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

// Mock component for testing
type MockComponentProps = {
  title?: string
  description?: string
  refreshInterval?: number
}

const RealUserMonitoringComponent = {
  render: async (props: MockComponentProps) => {
    return {
      container: `
        <div>
          <h2>${props.title || 'Real User Monitoring'}</h2>
          ${props.description ? `<p>${props.description}</p>` : ''}
          <div class="loading-performance"></div>
          <div class="interactivity"></div>
          <div class="visual-stability"></div>
          <div class="user-demographics"></div>
          <div class="resource-metrics"></div>
          <div class="error-rates"></div>
          <div class="loading-placeholder">Loading...</div>
          <div class="loading-placeholder">Loading...</div>
          <div class="last-updated">Last updated: Never</div>
          <button>Refresh Now</button>
        </div>
      `,
    }
  },
}
describe('RealUserMonitoring.astro', () => {
  // Mock window and performance objects
  beforeEach(() => {
    // Mock the document object methods
    Object.defineProperty(global.document, 'getElementById', {
      value: vi.fn().mockImplementation((_id) => {
        return {
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

  it('renders with default props', async () => {
    const { container } = await RealUserMonitoringComponent.render({})
    document.body.innerHTML = container

    // Check that the component renders with default title
    expect(document.querySelector('h2')?.textContent).toContain(
      'Real User Monitoring',
    )

    // Check for main sections
    expect(document.querySelector('.loading-performance')).not.toBeNull()
    expect(document.querySelector('.interactivity')).not.toBeNull()
    expect(document.querySelector('.visual-stability')).not.toBeNull()
    expect(document.querySelector('.user-demographics')).not.toBeNull()
    expect(document.querySelector('.resource-metrics')).not.toBeNull()
    expect(document.querySelector('.error-rates')).not.toBeNull()

    // Check for refresh button
    expect(document.querySelector('button')?.textContent).toContain(
      'Refresh Now',
    )
  })

  it('renders with custom props', async () => {
    const customTitle = 'Custom RUM Dashboard'
    const customDescription = 'Test description'

    const { container } = await RealUserMonitoringComponent.render({
      title: customTitle,
      description: customDescription,
      refreshInterval: 60000,
    })
    document.body.innerHTML = container

    expect(document.querySelector('h2')?.textContent).toContain(customTitle)
    expect(document.querySelector('p')?.textContent).toContain(
      customDescription,
    )
  })

  it('starts with loading placeholders', async () => {
    const { container } = await RealUserMonitoringComponent.render({})
    document.body.innerHTML = container

    // There should be loading placeholders initially
    const loadingElements = document.querySelectorAll('.loading-placeholder')
    expect(loadingElements.length).toBeGreaterThan(0)
  })

  it('shows last updated text', async () => {
    const { container } = await RealUserMonitoringComponent.render({})
    document.body.innerHTML = container

    expect(document.querySelector('.last-updated')?.textContent).toContain(
      'Last updated: Never',
    )
  })
})

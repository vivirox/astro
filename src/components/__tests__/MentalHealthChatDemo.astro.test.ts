import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import MentalHealthChatDemo from '../MentalHealthChatDemo.astro'

// Mock the MentalHealthChatDemoReact component
vi.mock('../MentalHealthChatDemoReact', () => ({
  default: vi.fn((props) => (
    <div data-testid="mental-health-chat-demo" data-props={JSON.stringify(props)}>
      <div className="chat-window">
        <div className="chat-messages">Sample chat message</div>
        <div className="chat-input">
          <input type="text" placeholder="Type your message..." />
          <button>Send</button>
        </div>
      </div>
      {props.showAnalysisPanel && (
        <div className="analysis-panel">Analysis Panel</div>
      )}
      {props.showSettingsPanel && (
        <div className="settings-panel">Settings Panel</div>
      )}
    </div>
  ))
}))

// Helper function to render Astro components in tests
async function renderAstroComponent(Component: any, props = {}) {
  const { default: defaultExport, ...otherExports } = Component
  const html = await Component.render(props)
  const container = document.createElement('div')
  container.innerHTML = html.html
  document.body.appendChild(container)
  return { container }
}

describe('MentalHealthChatDemo.astro', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders with default props', async () => {
    const { container } = await renderAstroComponent(MentalHealthChatDemo)

    // Check if the title and description are rendered with default values
    expect(container.querySelector('h2')).toHaveTextContent('Mental Health Chat Demo')
    expect(container.querySelector('p')).toHaveTextContent(
      'This demonstration shows how mental health analysis can be integrated into chat experiences.'
    )

    // Check if client component placeholder exists
    expect(container.innerHTML).toContain('mental-health-chat-demo')
  })

  it('renders with custom props', async () => {
    const customProps = {
      initialTab: 'settings',
      showSettingsPanel: false,
      showAnalysisPanel: false,
      title: 'Custom Chat Demo',
      description: 'Custom mental health chat description'
    }

    const { container } = await renderAstroComponent(MentalHealthChatDemo, customProps)

    // Check if the custom title and description are rendered
    expect(container.querySelector('h2')).toHaveTextContent('Custom Chat Demo')
    expect(container.querySelector('p')).toHaveTextContent('Custom mental health chat description')

    // Verify client:load component would receive the right props
    // In a real test, we'd check the props passed to the client component
    expect(container.innerHTML).toContain('initialTab="settings"')
    expect(container.innerHTML).toContain('showSettingsPanel={false}')
    expect(container.innerHTML).toContain('showAnalysisPanel={false}')
  })

  it('applies transition styles', async () => {
    const { container } = await renderAstroComponent(MentalHealthChatDemo)

    // Check if transition styles are applied
    const mainDiv = container.querySelector('div')
    expect(mainDiv).toHaveClass('transition-colors')
    expect(mainDiv).toHaveClass('duration-300')

    // Check if style element is included
    const styleElement = container.querySelector('style')
    expect(styleElement).toBeTruthy()
    expect(styleElement?.textContent).toContain('--transition-duration: 300ms')
  })

  it('has responsive layout classes', async () => {
    const { container } = await renderAstroComponent(MentalHealthChatDemo)

    const mainDiv = container.querySelector('div')
    expect(mainDiv).toHaveClass('w-full')
    expect(mainDiv).toHaveClass('max-w-6xl')
    expect(mainDiv).toHaveClass('mx-auto')
  })
})
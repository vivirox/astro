import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import '@testing-library/jest-dom'
import AIChat from '../AIChat.astro'

// Mock the AIChatReact component
vi.mock('../AIChatReact', () => ({
  default: vi.fn((props) => (
    <div data-testid="ai-chat-react" data-props={JSON.stringify(props)}>
      <div className="chat-window">
        <div className="chat-messages">AI: How can I assist you today?</div>
        <div className="chat-input">
          <input type="text" placeholder="Type your message..." />
          <button>Send</button>
        </div>
      </div>
      {props.showModelSelector && (
        <div className="model-selector">
          <label>Select AI Model</label>
          <select>
            {props.availableModels.map((model: any) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </select>
        </div>
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

describe('AIChat.astro', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  it('renders with default props', async () => {
    const { container } = await renderAstroComponent(AIChat)
    
    // Check if the title and description are rendered with default values
    expect(container.querySelector('h2')).toHaveTextContent('AI Chat')
    expect(container.querySelector('p')).toHaveTextContent(
      'Interact with our AI assistant powered by TogetherAI.'
    )
    
    // Check if client component placeholder exists
    expect(container.innerHTML).toContain('ai-chat-react')
  })

  it('renders with custom props', async () => {
    const customProps = {
      availableModels: [
        { id: 'openai/gpt-4', name: 'GPT-4' },
        { id: 'anthropic/claude-3', name: 'Claude 3' }
      ],
      showModelSelector: false,
      title: 'Custom AI Assistant',
      description: 'Specialized AI chat for technical support'
    }
    
    const { container } = await renderAstroComponent(AIChat, customProps)
    
    // Check if the custom title and description are rendered
    expect(container.querySelector('h2')).toHaveTextContent('Custom AI Assistant')
    expect(container.querySelector('p')).toHaveTextContent('Specialized AI chat for technical support')
    
    // Verify client:load component would receive the right props
    // In a real test environment, we could check the actual props passed
    const htmlContent = container.innerHTML
    expect(htmlContent).toContain('showModelSelector={false}')
    expect(htmlContent).toContain('openai/gpt-4')
    expect(htmlContent).toContain('anthropic/claude-3')
  })

  it('applies transition styles', async () => {
    const { container } = await renderAstroComponent(AIChat)
    
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
    const { container } = await renderAstroComponent(AIChat)
    
    const mainDiv = container.querySelector('div')
    expect(mainDiv).toHaveClass('w-full')
    expect(mainDiv).toHaveClass('max-w-2xl')
    expect(mainDiv).toHaveClass('mx-auto')
  })
}) 
import { describe, it, expect, beforeEach } from 'vitest'
import { screen } from '@testing-library/dom'
import DashboardLayout from '../DashboardLayout.astro'
import { renderAstro } from '@/test/utils/astro'

describe('DashboardLayout', () => {
  beforeEach(() => {
    document.body.innerHTML = ''
  })

  it('renders with default props', async () => {
    const { container } = await renderAstro(DashboardLayout)

    // Check basic structure
    expect(container.querySelector('html')).toBeInTheDocument()
    expect(container.querySelector('body')).toBeInTheDocument()
    expect(container.querySelector('main')).toBeInTheDocument()

    // Check default title and description
    expect(document.title).toBe('Gradiant Therapy | Dashboard')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Advanced therapeutic tools for mental health professionals',
    )
  })

  it('renders with custom props', async () => {
    const customProps = {
      title: 'Custom Title',
      description: 'Custom description',
      showHeader: false,
      showFooter: false,
      showSidebar: false,
    }

    const { container } = await renderAstro(DashboardLayout, customProps)

    // Check custom title and description
    expect(document.title).toBe('Custom Title')
    expect(document.querySelector('meta[name="description"]')).toHaveAttribute(
      'content',
      'Custom description',
    )

    // Check that optional components are not rendered
    expect(container.querySelector('header')).not.toBeInTheDocument()
    expect(container.querySelector('footer')).not.toBeInTheDocument()
    expect(container.querySelector('aside')).not.toBeInTheDocument()
  })

  it('applies custom className to content', async () => {
    const { container } = await renderAstro(DashboardLayout, {
      contentClassName: 'custom-content-class',
    })

    const main = container.querySelector('main')
    expect(main).toHaveClass('custom-content-class')
  })

  it('renders with meta image and type', async () => {
    const { container } = await renderAstro(DashboardLayout, {
      metaImage: '/custom-image.png',
      metaType: 'article',
    })

    expect(document.querySelector('meta[property="og:image"]')).toHaveAttribute(
      'content',
      '/custom-image.png',
    )
    expect(document.querySelector('meta[property="og:type"]')).toHaveAttribute(
      'content',
      'article',
    )
  })

  it('renders error boundary', async () => {
    const { container } = await renderAstro(DashboardLayout)

    expect(container.querySelector('error-boundary')).toBeInTheDocument()
  })
})

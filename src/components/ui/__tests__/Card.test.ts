import { describe, it, expect } from 'vitest'
import { screen } from '@testing-library/dom'
import { renderAstro } from '@/test/utils/astro'
import Card from '../Card.astro'
import CardHeader from '../CardHeader.astro'
import CardTitle from '../CardTitle.astro'
import CardDescription from '../CardDescription.astro'
import CardContent from '../CardContent.astro'
import CardFooter from '../CardFooter.astro'
import CardAction from '../CardAction.astro'

describe('Card Components', () => {
  describe('Card', () => {
    it('renders with base classes', async () => {
      const { container } = await renderAstro(Card)
      const card = container.querySelector('[data-slot="card"]')

      expect(card).toHaveClass(
        'bg-card',
        'text-card-foreground',
        'flex',
        'flex-col',
        'gap-6',
        'rounded-xl',
        'border',
        'py-6',
        'shadow-sm',
      )
    })

    it('applies custom classes', async () => {
      const customClass = 'custom-card'
      const { container } = await renderAstro(Card, { class: customClass })
      const card = container.querySelector('[data-slot="card"]')

      expect(card).toHaveClass(customClass)
    })

    it('renders slot content', async () => {
      const { container } = await renderAstro(Card, {}, 'Card Content')
      expect(screen.getByText('Card Content')).toBeInTheDocument()
    })
  })

  describe('CardHeader', () => {
    it('renders with base classes', async () => {
      const { container } = await renderAstro(CardHeader)
      const header = container.querySelector('[data-slot="card-header"]')

      expect(header).toHaveClass(
        '@container/card-header',
        'grid',
        'auto-rows-min',
        'grid-rows-[auto_auto]',
        'items-start',
        'gap-1.5',
        'px-6',
      )
    })

    it('applies grid columns when action slot is present', async () => {
      const { container } = await renderAstro(CardHeader, {
        'data-slot': 'card-action',
      })
      const header = container.querySelector('[data-slot="card-header"]')

      expect(header).toHaveClass(
        'has-data-[slot=card-action]:grid-cols-[1fr_auto]',
      )
    })
  })

  describe('CardTitle', () => {
    it('renders with base classes', async () => {
      const { container } = await renderAstro(CardTitle)
      const title = container.querySelector('[data-slot="card-title"]')

      expect(title).toHaveClass('leading-none', 'font-semibold')
    })

    it('renders title content', async () => {
      const { container } = await renderAstro(CardTitle, {}, 'Card Title')
      expect(screen.getByText('Card Title')).toBeInTheDocument()
    })
  })

  describe('CardDescription', () => {
    it('renders with base classes', async () => {
      const { container } = await renderAstro(CardDescription)
      const description = container.querySelector(
        '[data-slot="card-description"]',
      )

      expect(description).toHaveClass('text-muted-foreground', 'text-sm')
    })

    it('renders description content', async () => {
      const { container } = await renderAstro(
        CardDescription,
        {},
        'Card Description',
      )
      expect(screen.getByText('Card Description')).toBeInTheDocument()
    })
  })

  describe('CardContent', () => {
    it('renders with base classes', async () => {
      const { container } = await renderAstro(CardContent)
      const content = container.querySelector('[data-slot="card-content"]')

      expect(content).toHaveClass('px-6')
    })

    it('renders content', async () => {
      const { container } = await renderAstro(CardContent, {}, 'Card Content')
      expect(screen.getByText('Card Content')).toBeInTheDocument()
    })
  })

  describe('CardFooter', () => {
    it('renders with base classes', async () => {
      const { container } = await renderAstro(CardFooter)
      const footer = container.querySelector('[data-slot="card-footer"]')

      expect(footer).toHaveClass(
        'flex',
        'items-center',
        'px-6',
        '[.border-t]:pt-6',
      )
    })

    it('renders footer content', async () => {
      const { container } = await renderAstro(CardFooter, {}, 'Card Footer')
      expect(screen.getByText('Card Footer')).toBeInTheDocument()
    })
  })

  describe('CardAction', () => {
    it('renders with base classes', async () => {
      const { container } = await renderAstro(CardAction)
      const action = container.querySelector('[data-slot="card-action"]')

      expect(action).toHaveClass(
        'col-start-2',
        'row-span-2',
        'row-start-1',
        'self-start',
        'justify-self-end',
      )
    })

    it('renders action content', async () => {
      const { container } = await renderAstro(CardAction, {}, 'Card Action')
      expect(screen.getByText('Card Action')).toBeInTheDocument()
    })
  })

  describe('Card Integration', () => {
    it('renders a complete card with all components', async () => {
      const { container } = await renderAstro(
        Card,
        {},
        `
        <${CardHeader.name}>
          <${CardTitle.name}>Complete Card</${CardTitle.name}>
          <${CardDescription.name}>Card with all components</${CardDescription.name}>
          <${CardAction.name}>
            <button>Action</button>
          </${CardAction.name}>
        </${CardHeader.name}>
        <${CardContent.name}>
          Main content
        </${CardContent.name}>
        <${CardFooter.name}>
          Footer content
        </${CardFooter.name}>
      `,
      )

      expect(screen.getByText('Complete Card')).toBeInTheDocument()
      expect(screen.getByText('Card with all components')).toBeInTheDocument()
      expect(screen.getByText('Action')).toBeInTheDocument()
      expect(screen.getByText('Main content')).toBeInTheDocument()
      expect(screen.getByText('Footer content')).toBeInTheDocument()
    })
  })
})

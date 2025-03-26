import presetAttributify from '@unocss/preset-attributify'
import presetIcons from '@unocss/preset-icons'
import presetUno from '@unocss/preset-uno'
import { defineConfig } from 'unocss'

const presets = [
  presetUno(),
  presetAttributify(),
  presetIcons({
    scale: 1.2,
    extraProperties: {
      'display': 'inline-block',
      'vertical-align': 'middle',
    },
  }),
]

export default defineConfig({
  presets,
  theme: {
    fontFamily: {
      sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"',
      mono: 'DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      condensed: '"Roboto Condensed", Arial Narrow, Arial, sans-serif',
    },
  },
  preflights: [
    {
      layer: 'imports',
      getCSS: () =>
        `@import url('https://fonts.bunny.net/css?family=inter:400,600,800|dm-mono:400,600|roboto-condensed:400&display=swap');`,
    },
    {
      layer: 'fonts',
      getCSS: () => `
        /* Font family variables */
      `,
    },
  ],
})

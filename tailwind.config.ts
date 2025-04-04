import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      screens: {
        '2xl': '1536px',
        '3xl': '1920px',
        '4xl': '2560px',
        'print': { raw: 'print' },
      },
      printStyles: {
        'body': {
          color: '#000',
          background: '#fff',
        },
        'a': {
          'text-decoration': 'underline',
          'color': '#000',
        },
        'pre, code': {
          'background': '#f1f1f1',
          'border': '1px solid #ddd',
          'border-radius': '4px',
          'padding': '0.2em 0.4em',
        },
        '.no-print': {
          display: 'none',
        },
        '.print-only': {
          display: 'block',
        },
      },
    },
  },
  plugins: [
    // @ts-expect-error - Tailwind plugin API types are not fully compatible
    function ({ addBase, theme }) {
      addBase({
        '@media print': theme('printStyles'),
      })
    },
  ],
}

export default config

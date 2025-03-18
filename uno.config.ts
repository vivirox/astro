import { presetAttributify } from '@unocss/preset-attributify';
import { presetIcons } from '@unocss/preset-icons';
import { presetUno } from '@unocss/preset-uno';
import { defineConfig } from 'unocss';
import transformerDirectives from '@unocss/transformer-directives';
import transformerVariantGroup from '@unocss/transformer-variant-group';

export default defineConfig({
  presets: [
    presetUno(),
    presetAttributify(),
    presetIcons({
      scale: 1.2,
      extraProperties: {
        display: 'inline-block',
        'vertical-align': 'middle',
      },
    }),
  ],
  transformers: [
    transformerDirectives(),
    transformerVariantGroup()
  ],
  shortcuts: {
    btn: 'py-2 px-4 font-semibold rounded-lg shadow-md',
    'btn-primary': 'bg-primary text-white hover:bg-primary-dark',
    'flex-center': 'flex items-center justify-center',
    prose: 'max-w-3xl mx-auto text-base leading-7 text-gray-700 dark:text-gray-300',
    'slide-enter': 'transform-gpu transform transition duration-500 opacity-0',
  },
  theme: {
    colors: {
      primary: {
        DEFAULT: '#3f51b5',
        dark: '#303f9f',
        light: '#7986cb',
      },
      secondary: {
        DEFAULT: '#f50057',
        dark: '#c51162',
        light: '#ff4081',
      },
    },
    fontFamily: {
      sans: 'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif',
      mono: 'DM Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
      condensed: 'Roboto Condensed, ui-sans-serif, system-ui',
    },
  },
});

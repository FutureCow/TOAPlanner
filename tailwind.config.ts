import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // Apple-inspired dark-neutral palette replacing default slate
        slate: {
          50:  '#f5f5f7',
          100: '#e8e8ed',
          200: '#d1d1d6',
          300: '#aeaeb2',
          400: '#8e8e93',
          500: '#636366',
          600: '#48484a',
          700: '#3a3a3c',
          800: '#2c2c2e',
          900: '#1d1d1f',
          950: '#111113',
        },
      },
    },
  },
  plugins: [],
}
export default config

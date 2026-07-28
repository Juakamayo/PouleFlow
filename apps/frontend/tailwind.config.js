/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        graphite: {
          900: '#1C1F26',
          800: '#252932',
          700: '#2E323D',
        },
        stone: {
          100: '#F3F4F6',
          300: '#D7DAE0',
        },
        piste: {
          DEFAULT: '#C8102E',
          dark: '#9B0C23',
        },
        touch: {
          green: '#1F9D55',
        },
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
}

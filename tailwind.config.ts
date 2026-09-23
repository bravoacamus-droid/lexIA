import type { Config } from 'tailwindcss';

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // Brand — LexIA v2 (paleta corporativa azul)
        // Anclas: 500 = #0583F2 (primary), 950 = #021D40 (dark).
        // Tonos intermedios calculados por luminosidad/saturación.
        brand: {
          50: '#EAF4FE',
          100: '#C5E2FC',
          200: '#9CCEFB',
          300: '#6FB7F8',
          400: '#3FA2F6',
          500: '#0583F2',
          600: '#0470D1',
          700: '#035DAE',
          800: '#02488A',
          900: '#02335F',
          950: '#021D40',
        },
        // Las tres familias de acción — mockups de César (setiembre 2026).
        // La portada, la barra lateral y cada centro de sección se pintan
        // con estas tres y no con el azul de marca a secas: consultar es
        // azul, generar es verde, evaluar es violeta. Vive aquí y no en
        // clases sueltas para que los tres sitios no se separen.
        consultar: {
          50: '#EAF4FE',
          100: '#C5E2FC',
          400: '#3FA2F6',
          500: '#0583F2',
          600: '#0470D1',
          700: '#035DAE',
          900: '#02335F',
        },
        generar: {
          50: '#E7F8F0',
          100: '#C2EEDC',
          400: '#34C88A',
          500: '#0FA968',
          600: '#0B8C56',
          700: '#087045',
          900: '#044027',
        },
        evaluar: {
          50: '#F1ECFE',
          100: '#DCD0FC',
          400: '#9B7BF5',
          500: '#7A4FEE',
          600: '#6438D6',
          700: '#5029AE',
          900: '#2C1663',
        },
        // El azul profundo de la barra lateral y de las bandas de pie.
        noche: {
          700: '#062B5C',
          800: '#04244E',
          900: '#031C3D',
          950: '#02142C',
        },
        // Semantic
        success: 'hsl(var(--success))',
        warning: 'hsl(var(--warning))',
        danger: 'hsl(var(--danger))',
        info: 'hsl(var(--info))',
        citation: {
          DEFAULT: '#10B981',
          bg: '#D1FAE5',
          'bg-dark': '#064E3B',
        },
      },
      fontFamily: {
        sans: ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        serif: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
        mono: ['var(--font-jetbrains-mono)', 'monospace'],
      },
      fontSize: {
        '5xl': ['48px', { lineHeight: '52px', letterSpacing: '-0.02em' }],
        '6xl': ['60px', { lineHeight: '62px', letterSpacing: '-0.025em' }],
        '7xl': ['72px', { lineHeight: '74px', letterSpacing: '-0.03em' }],
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      boxShadow: {
        'soft': '0 1px 2px rgba(2, 29, 64, 0.05), 0 1px 3px rgba(2, 29, 64, 0.08)',
        'glow': '0 0 0 1px rgba(5, 131, 242, 0.12), 0 4px 16px rgba(5, 131, 242, 0.14)',
        'glow-strong': '0 0 0 1px rgba(5, 131, 242, 0.22), 0 8px 32px rgba(5, 131, 242, 0.26)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          '0%': { opacity: '0', transform: 'translateY(20px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pulse-soft': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.5' },
        },
        'cursor-blink': {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0' },
        },
        'shimmer': {
          '0%': { backgroundPosition: '-1000px 0' },
          '100%': { backgroundPosition: '1000px 0' },
        },
        'gradient-shift': {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        'companero-levita': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-10px)' },
        },
        'companero-rebote': {
          '0%, 100%': { transform: 'translateY(0) scale(1)' },
          '30%': { transform: 'translateY(-18px) scale(1.03)' },
          '55%': { transform: 'translateY(0) scale(0.98)' },
          '75%': { transform: 'translateY(-6px) scale(1.01)' },
        },
        'companero-respira': {
          '0%, 100%': { opacity: '0.55', transform: 'translate(-50%, -50%) scale(1)' },
          '50%': { opacity: '0.95', transform: 'translate(-50%, -50%) scale(1.12)' },
        },
        'companero-orbita': {
          '0%': { transform: 'translateY(-50%) rotate(0deg)' },
          '100%': { transform: 'translateY(-50%) rotate(360deg)' },
        },
        'companero-onda': {
          '0%': { opacity: '0.8', transform: 'translate(-50%, -50%) scale(0.55)' },
          '100%': { opacity: '0', transform: 'translate(-50%, -50%) scale(1.5)' },
        },
        'companero-onda-inversa': {
          '0%': { opacity: '0', transform: 'translate(-50%, -50%) scale(1.5)' },
          '100%': { opacity: '0.8', transform: 'translate(-50%, -50%) scale(0.55)' },
        },
        'companero-destello': {
          '0%, 100%': { opacity: '0', transform: 'scale(0.4) rotate(0deg)' },
          '45%': { opacity: '1', transform: 'scale(1) rotate(80deg)' },
        },
        'nav-progress': {
          '0%': { transform: 'scaleX(0)', opacity: '1' },
          '30%': { transform: 'scaleX(0.4)', opacity: '1' },
          '70%': { transform: 'scaleX(0.7)', opacity: '1' },
          '100%': { transform: 'scaleX(0.95)', opacity: '1' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
        'fade-in': 'fade-in 0.4s ease-out forwards',
        'slide-up': 'slide-up 0.5s ease-out forwards',
        'pulse-soft': 'pulse-soft 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'cursor-blink': 'cursor-blink 0.9s infinite',
        'shimmer': 'shimmer 2s linear infinite',
        'gradient-shift': 'gradient-shift 8s ease infinite',
        'companero-levita': 'companero-levita 5s ease-in-out infinite',
        'companero-rebote': 'companero-rebote 1.6s ease-in-out infinite',
        'companero-respira': 'companero-respira 4.5s ease-in-out infinite',
        'companero-orbita': 'companero-orbita 6s linear infinite',
        'companero-onda': 'companero-onda 1.65s ease-out infinite',
        'companero-onda-inversa': 'companero-onda-inversa 1.65s ease-in infinite',
        'companero-destello': 'companero-destello 2.4s ease-in-out infinite',
        'nav-progress': 'nav-progress 8s cubic-bezier(0.1, 0.9, 0.3, 1) forwards',
      },
      backgroundImage: {
        'gradient-radial': 'radial-gradient(circle at center, var(--tw-gradient-stops))',
        'grid-light': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' fill='none' stroke='rgb(15 23 42 / 0.06)'%3E%3Cpath d='M0 .5H31.5V32'/%3E%3C/svg%3E\")",
        'grid-dark': "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' fill='none' stroke='rgb(255 255 255 / 0.05)'%3E%3Cpath d='M0 .5H31.5V32'/%3E%3C/svg%3E\")",
      },
    },
  },
  plugins: [require('tailwindcss-animate'), require('@tailwindcss/typography')],
};

export default config;

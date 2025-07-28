/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}'
  ],
  theme: {
    extend: {
      colors: {
        // Dark theme colors
        dark: '#1E1E1E',
        card: '#242526',
        border: '#333',
        accent: '#3B82F6',
        text: '#F3F4F6',
        muted: '#A0AEC0',
        skeleton: '#23272b',
        
        // Light theme colors
        light: '#FFFFFF',
        'light-card': '#F9FAFB',
        'light-border': '#E5E7EB',
        'light-text': '#1F2937',
        'light-muted': '#6B7280',
        'light-skeleton': '#F3F4F6',
      },
      backgroundImage: {
        'card-gradient': 'linear-gradient(to bottom, #242526 0%, #232425 100%)',
      },
      boxShadow: {
        card: '0 2px 12px 0 rgba(0,0,0,0.12)',
        lg: '0 4px 24px 0 rgba(0,0,0,0.18)',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        xl: '1rem',
      },
      transitionProperty: {
        'height': 'height',
        'spacing': 'margin, padding',
      },
      spacing: {
        18: '4.5rem',
        22: '5.5rem',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
      animation: {
        shimmer: 'shimmer 1.5s infinite linear',
      },
    },
  },
  plugins: [],
};

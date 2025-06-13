/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)', opacity: '0' },
          '100%': { transform: 'translateX(0)', opacity: '1' },
        }
      },
      colors: {
        'zkp-blue': '#3B82F6',
        'zkp-purple': '#8B5CF6',
        'zkp-green': '#10B981',
      }
    },
  },
  plugins: [],
  safelist: [
    // Dynamic color classes used in components
    'bg-blue-500', 'bg-green-500', 'bg-purple-500', 'bg-emerald-500',
    'border-blue-500', 'border-green-500', 'border-purple-500', 'border-emerald-500',
    'text-blue-600', 'text-green-600', 'text-purple-600', 'text-emerald-600',
    'text-blue-500', 'text-green-500', 'text-purple-500', 'text-emerald-500',
  ]
};
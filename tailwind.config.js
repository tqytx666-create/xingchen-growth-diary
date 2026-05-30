/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{vue,js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        star: {
          bg: '#1a1535',
          mid: '#2d2456',
          card: '#241d3d',
          accent: '#ffd86b',
          violet: '#7c6bff',
          pink: '#ff9ec7',
          good: '#6bffb0',
          bad: '#ff7a7a'
        }
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', 'sans-serif']
      },
      borderRadius: { '2xl': '1rem', '3xl': '1.5rem' }
    }
  },
  plugins: []
}

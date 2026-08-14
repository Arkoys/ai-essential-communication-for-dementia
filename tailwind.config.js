export default {
    content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
    theme: {
      extend: {
        keyframes: {
          'pulse-border': {
            '0%, 100%': { 
              borderColor: 'rgb(255 255 255 / 1)',
              boxShadow: '0 0 0 0 rgb(249 115 22 / 0)',
            },
            '50%': { 
              borderColor: 'rgb(249 115 22 / 1)',
              boxShadow: '0 0 16px 4px rgb(249 115 22 / 0.5)',
            },
          },
        },
        animation: {
          'pulse-border': 'pulse-border 3s ease-in-out infinite',
        },
      },
    },
    plugins: [
      require("@tailwindcss/typography"),
    ],
  }

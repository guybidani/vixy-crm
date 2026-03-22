/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#6161FF",
          hover: "#4E4ED9",
          light: "#E8E8FF",
          dark: "#4040CC",
        },
        success: {
          DEFAULT: "#00CA72",
          light: "#D6F5E8",
        },
        warning: {
          DEFAULT: "#FDAB3D",
          light: "#FEF0D8",
        },
        danger: {
          DEFAULT: "#FB275D",
          light: "#FDE0E7",
        },
        purple: {
          DEFAULT: "#A25DDC",
          light: "#EDE1F5",
        },
        orange: {
          DEFAULT: "#FF642E",
          light: "#FFE4D9",
        },
        sky: {
          DEFAULT: "#66CCFF",
          light: "#E0F4FF",
        },
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F5F6F8",
          tertiary: "#EBEBEF",
        },
        text: {
          primary: "#323338",
          secondary: "#676879",
          tertiary: "#C3C6D4",
        },
        border: {
          DEFAULT: "#D0D4E4",
          light: "#EEEFF3",
        },
      },
      fontFamily: {
        sans: ["Poppins", "Inter", "system-ui", "-apple-system", "sans-serif"],
      },
      borderRadius: {
        DEFAULT: "8px",
        md: "8px",
        lg: "12px",
        xl: "16px",
      },
      boxShadow: {
        card: "0 1px 4px rgba(0, 0, 0, 0.08)",
        "card-hover": "0 8px 24px rgba(0, 0, 0, 0.12)",
        "card-glow": "0 8px 32px rgba(97, 97, 255, 0.15)",
        modal: "0 8px 32px rgba(0, 0, 0, 0.16)",
        sidebar: "1px 0 8px rgba(0, 0, 0, 0.06)",
        glass: "0 4px 16px rgba(0, 0, 0, 0.06)",
      },
      keyframes: {
        "fade-in-up": {
          "0%": { opacity: "0", transform: "translateY(8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "slide-in-right": {
          "0%": { opacity: "0", transform: "translateX(12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "slide-in-left": {
          "0%": { opacity: "0", transform: "translateX(-12px)" },
          "100%": { opacity: "1", transform: "translateX(0)" },
        },
        "scale-check": {
          "0%": { opacity: "0", transform: "scale(0.5)" },
          "60%": { opacity: "1", transform: "scale(1.15)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "strength-fill": {
          "0%": { width: "0%" },
          "100%": { width: "var(--strength-width)" },
        },
      },
      animation: {
        "fade-in-up": "fade-in-up 0.3s ease-out both",
        "slide-in-right": "slide-in-right 0.25s ease-out both",
        "slide-in-left": "slide-in-left 0.25s ease-out both",
        "scale-check": "scale-check 0.5s ease-out both",
      },
    },
  },
  plugins: [],
};

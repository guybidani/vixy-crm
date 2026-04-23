/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        // Monday.com primary (blue)
        primary: {
          DEFAULT: "#0073EA",
          hover: "#0060C2",
          active: "#0060C2",
          selected: "#CCE5FF",
          light: "#CCE5FF",
          dark: "#0060C2",
        },
        // Status / semantic colors (Monday.com tuned)
        success: {
          DEFAULT: "#00C875",
          light: "#D6F5E8",
        },
        warning: {
          DEFAULT: "#FDAB3D",
          light: "#FEF0D8",
        },
        danger: {
          DEFAULT: "#E2445C",
          hover: "#D62A41",
          light: "#FDE0E7",
        },
        info: {
          DEFAULT: "#579BFC",
          light: "#E0ECFE",
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
        // Surfaces (slight blue tint — Monday signature)
        surface: {
          DEFAULT: "#FFFFFF",
          secondary: "#F6F7FB",
          tertiary: "#E6E9EF",
        },
        bg: {
          primary: "#FFFFFF",
          secondary: "#F6F7FB",
          tertiary: "#E6E9EF",
        },
        // Text hierarchy
        text: {
          primary: "#323338",
          secondary: "#676879",
          tertiary: "#9699A6",
          placeholder: "#C5C7D0",
        },
        // Borders
        border: {
          DEFAULT: "#E6E9EF",
          hover: "#D0D4E4",
          focus: "#0073EA",
          light: "#EEEFF3",
        },
      },
      fontFamily: {
        sans: [
          "Figtree",
          "Rubik",
          "Poppins",
          "Inter",
          "system-ui",
          "-apple-system",
          "sans-serif",
        ],
      },
      letterSpacing: {
        button: "0.15px",
      },
      borderRadius: {
        DEFAULT: "4px",
        sm: "4px",
        md: "6px",
        lg: "8px",
        xl: "12px",
        "2xl": "16px",
      },
      boxShadow: {
        sm: "0 1px 2px rgba(0, 0, 0, 0.04)",
        DEFAULT: "0 4px 12px rgba(0, 0, 0, 0.08)",
        lg: "0 8px 24px rgba(0, 0, 0, 0.12)",
        popover: "0 4px 20px rgba(0, 0, 0, 0.15)",
        card: "0 1px 2px rgba(0, 0, 0, 0.04)",
        "card-hover": "0 4px 12px rgba(0, 0, 0, 0.08)",
        "card-glow": "0 8px 32px rgba(0, 115, 234, 0.15)",
        modal: "0 8px 24px rgba(0, 0, 0, 0.12)",
        sidebar: "1px 0 8px rgba(0, 0, 0, 0.06)",
        glass: "0 4px 16px rgba(0, 0, 0, 0.06)",
      },
      transitionDuration: {
        button: "100ms",
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

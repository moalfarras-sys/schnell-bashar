/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          50: "#eff6ff",
          100: "#dbeafe",
          200: "#bfdbfe",
          300: "#93c5fd",
          400: "#60a5fa",
          500: "#3b82f6",  // Primary brand
          600: "#2563eb",  // Darker brand
          700: "#1d4ed8",
          800: "#1e40af",
          900: "#1e3a8a",
          950: "#172554",
        },
        glass: {
          white: "rgba(255, 255, 255, 0.95)",
          light: "rgba(255, 255, 255, 0.18)",
          dark: "rgba(15, 23, 42, 0.92)",
          solid: "rgba(255, 255, 255, 1)",
        },
      },
      boxShadow: {
        soft: "0 8px 24px rgba(10, 16, 32, 0.06)",
        premium: "0 14px 40px rgba(10, 16, 32, 0.08)",
        premiumSoft: "0 8px 24px rgba(10, 16, 32, 0.06)",
        premiumEmphasis: "0 4px 16px rgba(10, 16, 32, 0.05)",
        glassSm: "0 4px 16px rgba(10, 16, 32, 0.05)",
        glassMd: "0 8px 24px rgba(10, 16, 32, 0.06)",
        glassLg: "0 16px 40px rgba(10, 16, 32, 0.08)",
        glassXl: "0 24px 56px rgba(10, 16, 32, 0.10)",
        glow: "0 0 24px rgba(47, 140, 255, 0.18)",
        glowStrong: "0 0 40px rgba(47, 140, 255, 0.28)",
        card: "var(--glass-ring, 0 0 0 0.5px rgba(10,16,32,0.06)), 0 4px 12px rgba(10, 16, 32, 0.05), inset 0 1px 0 rgba(255,255,255,0.70)",
        glassInset: "inset 0 1px 0 0 rgba(255, 255, 255, 0.70)",
      },
      backdropBlur: {
        xs: "8px",
        sm: "12px",
        md: "16px",
        lg: "20px",
        xl: "24px",
        "2xl": "32px",
      },
      borderRadius: {
        "4xl": "2rem",
        "5xl": "3rem",
      },
      transitionTimingFunction: {
        premium: "cubic-bezier(0.2, 0.8, 0.2, 1)",
        smooth: "cubic-bezier(0.4, 0, 0.2, 1)",
      },
      transitionDuration: {
        fast: "120ms",
        normal: "220ms",
        slow: "360ms",
      },
      backgroundImage: {
        "glass-gradient": "var(--glass-gradient-hero)",
        "glass-card": "var(--glass-gradient-card)",
        "glass-premium": "var(--glass-gradient-premium)",
      },
      fontFamily: {
        display: ["var(--font-manrope)", "var(--font-inter)", "Inter", "sans-serif"],
        sans: ["var(--font-inter)", "Inter", "system-ui", "sans-serif"],
      },
      fontSize: {
        "display-sm": ["2.5rem", { lineHeight: "1.1", letterSpacing: "-0.02em" }],
        "display-md": ["3rem", { lineHeight: "1.1", letterSpacing: "-0.025em" }],
        "display-lg": ["4rem", { lineHeight: "1.05", letterSpacing: "-0.03em" }],
      },
      animation: {
        "fade-in-up": "fadeInUp 620ms cubic-bezier(0.22, 1, 0.36, 1) both",
        "glass-shimmer": "glass-shimmer 3s ease-in-out infinite",
        "micro-bounce": "micro-bounce 0.5s ease-in-out",
        "micro-pulse": "micro-pulse 2s ease-in-out infinite",
        "micro-float": "micro-float 3s ease-in-out infinite",
      },
    },
  },
  plugins: [require("@tailwindcss/typography")],
};


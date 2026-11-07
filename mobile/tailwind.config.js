// Hand-ported from ../app/globals.css -- same Claymorphism token values,
// not the Crimson Direct palette from the mockups (see CLAUDE.md's design
// rule: one cohesive visual language, reused here for mobile too). Keep
// these two files in sync by hand when the web tokens change -- there is
// no shared package between web and mobile (see mobile/README.md).
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  darkMode: "media",
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        forest: {
          900: "#4a0718",
          800: "#a00c30",
          700: "#b8122f",
          600: "#da1a32",
          500: "#e8495c",
          100: "#fbe2e5",
        },
        ivory: {
          50: "#ffffff",
          100: "#f7f6f6",
          200: "#efeded",
        },
        sage: {
          100: "#f2f2f2",
          200: "#e8e8e8",
          300: "#d6d6d6",
        },
        clay: {
          400: "#e8495c",
          500: "#da1a32",
          600: "#a00c30",
        },
        // charcoal-700/500/400 flip for dark mode (see DarkModeColors);
        // kept here only for callers that want the fixed light value.
        charcoal: {
          900: "#000000",
          700: "#1a1a1a",
          500: "#4d4d4d",
          400: "#737373",
        },
        // Light-mode defaults for the web's --color-surface/--background/
        // --border vars. No CSS custom properties on mobile, so every
        // usage pairs these with an explicit dark: counterpart at the
        // call site (e.g. "bg-surface dark:bg-charcoal-900"), same
        // pattern used to fix the web app's own hardcoded-light-panel
        // dark-mode bugs this session.
        surface: "#ffffff",
        canvas: "#f7f6f6",
        border: "#e5e5e5",
        success: { 500: "#2f8f5b", 100: "#e3f3ea" },
        warning: { 500: "#b9790f", 100: "#fbf0dc" },
        error: { 500: "#c23f3f", 100: "#fae7e7" },
        info: { 500: "#2f6fa6", 100: "#e5f0f9" },
      },
      borderRadius: {
        sm: "10px",
        md: "14px",
        lg: "20px",
        xl: "28px",
        "2xl": "36px",
      },
      fontFamily: {
        // Loaded via expo-font in app/_layout.tsx; same pairing as the
        // web app's next/font setup (Manrope body / Plus Jakarta Sans
        // display).
        sans: ["Manrope_400Regular"],
        "sans-medium": ["Manrope_500Medium"],
        "sans-semibold": ["Manrope_600SemiBold"],
        display: ["PlusJakartaSans_600SemiBold"],
        "display-bold": ["PlusJakartaSans_700Bold"],
      },
    },
  },
  plugins: [],
};

// Hand-ported from ../app/globals.css -- same Claymorphism token values,
// not the Crimson Direct palette from the mockups (see CLAUDE.md's design
// rule: one cohesive visual language, reused here for mobile too). Keep
// these two files in sync by hand when the web tokens change -- there is
// no shared package between web and mobile (see mobile/README.md).
// Theme tokens live in global.css as space-separated RGB channels so
// Tailwind's alpha modifiers still work; see that file for why mobile
// now has runtime theming at all.
const withOpacity = (v) => `rgb(var(${v}) / <alpha-value>)`;

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
          100: "#f7f4f0",
          200: "#efeae4",
        },
        sage: {
          100: "#f1ece6",
          200: "#e7e0d8",
          300: "#d6ccc0",
        },
        clay: {
          400: "#e8495c",
          500: "#da1a32",
          600: "#a00c30",
        },
        // charcoal-700/500/400 flip for dark mode (see DarkModeColors);
        // kept here only for callers that want the fixed light value.
        charcoal: {
          900: "#0c0a09",
          700: "#1c1917",
          500: "#57534e",
          400: "#6e6762",
        },
        // Light-mode defaults for the web's --color-surface/--background/
        // --border vars. No CSS custom properties on mobile, so every
        // usage pairs these with an explicit dark: counterpart at the
        // call site (e.g. "bg-surface dark:bg-charcoal-900"), same
        // pattern used to fix the web app's own hardcoded-light-panel
        // dark-mode bugs this session.
        surface: "#ffffff",
        canvas: "#f7f4f0",
        border: "#e7e0d8",

        // Theme-aware tokens, defined in global.css and flipped there by
        // prefers-color-scheme. Unlike every colour above, these need no
        // `dark:` counterpart at the call site.
        "surface-base": withOpacity("--surface-base"),
        "surface-raised": withOpacity("--surface-raised"),
        "surface-muted": withOpacity("--surface-muted"),
        "border-themed": withOpacity("--border-token"),
        "content-strong": withOpacity("--content-strong"),
        "content-muted": withOpacity("--content-muted"),
        "content-subtle": withOpacity("--content-subtle"),
        accent: withOpacity("--accent-fill"),
        "accent-text": withOpacity("--accent-text"),
        "accent-soft": withOpacity("--accent-soft"),
        "accent-on-soft": withOpacity("--accent-on-soft"),
        success: { 500: "#2f8f5b", 100: "#e3f3ea", DEFAULT: withOpacity("--success-text"), soft: withOpacity("--success-soft") },
        warning: { 500: "#b9790f", 100: "#fbf0dc", DEFAULT: withOpacity("--warning-text"), soft: withOpacity("--warning-soft") },
        error: { 500: "#c23f3f", 100: "#fae7e7", DEFAULT: withOpacity("--error-text"), soft: withOpacity("--error-soft") },
        info: { 500: "#2f6fa6", 100: "#e5f0f9", DEFAULT: withOpacity("--info-text"), soft: withOpacity("--info-soft") },
      },
      borderRadius: {
        sm: "10px",
        md: "14px",
        lg: "20px",
        xl: "28px",
        "2xl": "36px",
      },
      boxShadow: {
        // Single-layer approximations of web's (possibly dual-layer)
        // app/globals.css shadow tokens -- NativeWind/RN only support one
        // shadow layer per view, so these are tuned slightly heavier than
        // a literal copy of web's outer layer alone, to read correctly
        // against a pure-black background, not pixel-matched to the CSS.
        // clay-inset/clay-raised are intentionally not ported as generic
        // utilities here -- RN has no inset-shadow support and no
        // multi-layer/dual-tone support without a new dependency; see
        // Input.tsx and verification.tsx/pricing.tsx for how those two
        // are handled instead. On Android these compile to OS-native
        // grey-tinted `elevation` (no color control) -- an accepted
        // platform divergence from iOS.
        subtle: "0 1px 3px rgba(0,0,0,0.08)",
        raised: "0 4px 10px rgba(0,0,0,0.14)",
        floating: "0 8px 20px rgba(0,0,0,0.18)",
        modal: "0 16px 32px rgba(0,0,0,0.30)",
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

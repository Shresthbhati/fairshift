import { createSystem, defaultConfig, defineConfig } from '@chakra-ui/react';

// "Ledger & Stamp": warm paper surfaces, ink text, a green ledger accent, blue stamps. Light only (outdoor use).
const config = defineConfig({
  theme: {
    tokens: {
      colors: {
        paper: { 50: { value: '#FBF8F1' }, 100: { value: '#F4EEE1' }, 200: { value: '#E8DFCB' }, 300: { value: '#D6CAB0' } },
        ink: { 500: { value: '#5E6B7A' }, 700: { value: '#3A4554' }, 900: { value: '#1C2430' } },
        ledger: {
          50: { value: '#E8F3EE' }, 100: { value: '#CFE6DC' }, 600: { value: '#1F6B52' },
          700: { value: '#185641' }, 800: { value: '#12412F' },
        },
        stamp: { blue: { value: '#2F4AA0' } },
        // Darker than the plan's #2E7D4F / #A86A00: measured contrast on paper-100 was 4.36 / 3.84, below WCAG AA (4.5).
        success: { value: '#226A45' },
        warning: { value: '#855200' },
        danger: { value: '#B3261E' },
        info: { value: '#2F6DB5' },
      },
      fonts: {
        body: { value: 'var(--font-body), system-ui, sans-serif' },
        heading: { value: 'var(--font-heading), Georgia, serif' },
      },
      shadows: {
        paper: { value: '0 1px 0 rgba(255,255,255,.8) inset, 0 1px 2px rgba(28,36,48,.08), 0 4px 12px rgba(28,36,48,.06)' },
        key: { value: '0 2px 0 #12412F, 0 3px 6px rgba(28,36,48,.15)' },
        keyQuiet: { value: '0 2px 0 #D6CAB0, 0 3px 6px rgba(28,36,48,.10)' },
      },
      radii: { sm: { value: '4px' }, md: { value: '8px' }, lg: { value: '12px' } },
    },
    semanticTokens: {
      colors: {
        bg: { DEFAULT: { value: '{colors.paper.100}' }, surface: { value: '{colors.paper.50}' }, muted: { value: '{colors.paper.200}' } },
        fg: { DEFAULT: { value: '{colors.ink.900}' }, muted: { value: '{colors.ink.700}' }, subtle: { value: '{colors.ink.500}' } },
        border: { DEFAULT: { value: '{colors.paper.300}' } },
        ledger: {
          solid: { value: '{colors.ledger.600}' }, contrast: { value: 'white' }, fg: { value: '{colors.ledger.700}' },
          muted: { value: '{colors.ledger.100}' }, subtle: { value: '{colors.ledger.50}' },
          emphasized: { value: '{colors.ledger.100}' }, focusRing: { value: '{colors.stamp.blue}' },
        },
      },
    },
  },
});

export const system = createSystem(defaultConfig, config);

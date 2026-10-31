/**
 * LavagnaTattica — Configuratore Temi Cromatici Campo & UI
 *
 * Include il tema calcistico autentico "Verde Prato & Bianco Crema",
 * la modalità Cyber Dark "Notte Tattica", la "Lavagna Gesso" e il "Blueprint".
 */

export interface PitchThemeConfig {
  id: string;
  name: string;
  iconName: string;
  turfBase: string;
  turfStripe: string;
  stripeOpacity: number;
  lineColor: string;
  lineOpacity: number;
  lineWidth: number;
  centerDotColor: string;
  halfSpaceFill: string;
  halfSpaceStroke: string;
  halfSpaceText: string;
  gridLineColor: string;
  benchCardBg: string;
  benchCardBorder: string;
  textPrimary: string;
  textMuted: string;
  accent: string;
}

export const PITCH_THEMES: Record<string, PitchThemeConfig> = {
  grass_cream: {
    id: 'grass_cream',
    name: 'Verde Prato & Bianco Crema',
    iconName: 'grass',
    turfBase: '#154425',
    turfStripe: '#1b522d',
    stripeOpacity: 0.9,
    lineColor: '#FAF7EE', // Bianco crema caldo d'autore
    lineOpacity: 0.92,
    lineWidth: 2,
    centerDotColor: '#FAF7EE',
    halfSpaceFill: 'rgba(250, 247, 238, 0.06)',
    halfSpaceStroke: 'rgba(250, 247, 238, 0.4)',
    halfSpaceText: '#FAF7EE',
    gridLineColor: 'rgba(250, 247, 238, 0.18)',
    benchCardBg: 'rgba(21, 68, 37, 0.65)',
    benchCardBorder: 'rgba(250, 247, 238, 0.25)',
    textPrimary: '#FAF7EE',
    textMuted: '#D0DDD3',
    accent: '#A8FF60',
  },
  neon: {
    id: 'neon',
    name: 'Notte Tattica Cyber (Ardesia & Ciano)',
    iconName: 'night',
    turfBase: '#0B1220',
    turfStripe: '#0f1f33',
    stripeOpacity: 0.6,
    lineColor: '#FFFFFF',
    lineOpacity: 0.75,
    lineWidth: 2,
    centerDotColor: 'rgba(255,255,255,0.85)',
    halfSpaceFill: 'rgba(0, 229, 255, 0.04)',
    halfSpaceStroke: 'rgba(0, 229, 255, 0.25)',
    halfSpaceText: '#00E5FF',
    gridLineColor: 'rgba(255, 255, 255, 0.12)',
    benchCardBg: 'rgba(11, 18, 32, 0.6)',
    benchCardBorder: 'rgba(0, 229, 255, 0.2)',
    textPrimary: '#FFFFFF',
    textMuted: '#94A3B8',
    accent: '#00E5FF',
  },
  chalk: {
    id: 'chalk',
    name: 'Lavagna Gesso & Crema',
    iconName: 'chalk',
    turfBase: '#1A2420',
    turfStripe: '#222E29',
    stripeOpacity: 0.75,
    lineColor: '#F4EFE0',
    lineOpacity: 0.88,
    lineWidth: 2.2,
    centerDotColor: '#F4EFE0',
    halfSpaceFill: 'rgba(244, 239, 224, 0.05)',
    halfSpaceStroke: 'rgba(244, 239, 224, 0.35)',
    halfSpaceText: '#E6DCC8',
    gridLineColor: 'rgba(244, 239, 224, 0.15)',
    benchCardBg: 'rgba(26, 36, 32, 0.65)',
    benchCardBorder: 'rgba(244, 239, 224, 0.2)',
    textPrimary: '#F4EFE0',
    textMuted: '#B9C4BE',
    accent: '#E6DCC8',
  },
  blueprint: {
    id: 'blueprint',
    name: 'Blueprint Architettura Tattica',
    iconName: 'blueprint',
    turfBase: '#0A2540',
    turfStripe: '#0F3057',
    stripeOpacity: 0.75,
    lineColor: '#A5C9EB',
    lineOpacity: 0.85,
    lineWidth: 1.8,
    centerDotColor: '#C4E1FD',
    halfSpaceFill: 'rgba(165, 201, 235, 0.06)',
    halfSpaceStroke: 'rgba(165, 201, 235, 0.35)',
    halfSpaceText: '#C4E1FD',
    gridLineColor: 'rgba(165, 201, 235, 0.18)',
    benchCardBg: 'rgba(10, 37, 64, 0.6)',
    benchCardBorder: 'rgba(165, 201, 235, 0.25)',
    textPrimary: '#E8F1F5',
    textMuted: '#8DA9C4',
    accent: '#64B5F6',
  },
};

export function getPitchTheme(themeKey: string): PitchThemeConfig {
  return PITCH_THEMES[themeKey] || PITCH_THEMES.grass_cream;
}


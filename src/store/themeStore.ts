import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface ThemePalette {
  name: string
  wine: string
  wineMedium: string
  wineLight: string
  wineSubtle: string
  cream: string
  creamWarm: string
}

export const PALETTES: ThemePalette[] = [
  { name: 'Vinho',  wine: '#6B2D3E', wineMedium: '#8B3A4E', wineLight: '#C4697A', wineSubtle: '#F5E8EB', cream: '#FAF7F2', creamWarm: '#FFF9F0' },
  { name: 'Azul',   wine: '#1E3A5F', wineMedium: '#2D5282', wineLight: '#4A90D9', wineSubtle: '#EBF2FF', cream: '#F0F4F8', creamWarm: '#F7FAFF' },
  { name: 'Verde',  wine: '#1A5C3A', wineMedium: '#247A4E', wineLight: '#4AAD72', wineSubtle: '#E8F5EE', cream: '#F0FAF4', creamWarm: '#F7FFF9' },
  { name: 'Roxo',   wine: '#4A1D6B', wineMedium: '#6B2D99', wineLight: '#9B59C4', wineSubtle: '#F0E8FA', cream: '#FAF7FF', creamWarm: '#FFF5FF' },
  { name: 'Preto',  wine: '#1A1A1A', wineMedium: '#2D2D2D', wineLight: '#666666', wineSubtle: '#F0F0F0', cream: '#FAFAFA', creamWarm: '#FFFFFF' },
]

export function applyPalette(p: ThemePalette) {
  const r = document.documentElement
  r.style.setProperty('--color-wine', p.wine)
  r.style.setProperty('--color-wine-medium', p.wineMedium)
  r.style.setProperty('--color-wine-light', p.wineLight)
  r.style.setProperty('--color-wine-subtle', p.wineSubtle)
  r.style.setProperty('--color-cream', p.cream)
  r.style.setProperty('--color-cream-warm', p.creamWarm)
  r.style.setProperty('--color-status-scheduled', p.wine)
}

interface ThemeState {
  activePalette: ThemePalette
  setPalette: (palette: ThemePalette) => void
  resetPalette: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      activePalette: PALETTES[0],
      setPalette: (palette) => {
        applyPalette(palette)
        set({ activePalette: palette })
      },
      resetPalette: () => {
        applyPalette(PALETTES[0])
        set({ activePalette: PALETTES[0] })
      },
    }),
    { name: 'criativa-theme' }
  )
)

export function initTheme() {
  try {
    const stored = localStorage.getItem('criativa-theme')
    if (stored) {
      const { state } = JSON.parse(stored)
      if (state?.activePalette) applyPalette(state.activePalette)
    }
  } catch {}
}

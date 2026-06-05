import { useState, useRef, useEffect } from 'react'
import { Paintbrush2, Check, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'motion/react'
import { useThemeStore, PALETTES } from '@/store/themeStore'

export function ThemePicker() {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const { activePalette, setPalette, resetPalette } = useThemeStore()

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClickOutside)
    return () => document.removeEventListener('mousedown', onClickOutside)
  }, [])

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        title="Personalizar tema"
        className="flex items-center justify-center w-8 h-8 rounded-lg border transition-colors cursor-pointer hover:border-wine/40"
        style={{ borderColor: 'var(--color-gray-border)', color: 'var(--color-gray-text)' }}
      >
        <Paintbrush2 size={16} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 mt-2 w-52 rounded-xl border shadow-modal z-50 overflow-hidden"
            style={{ background: 'white', borderColor: 'var(--color-gray-border)' }}
          >
            <div className="px-3 py-2.5 border-b" style={{ borderBottomColor: 'var(--color-gray-border)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-gray-text)' }}>
                Paleta de cores
              </p>
            </div>

            <div className="p-1.5 flex flex-col gap-0.5">
              {PALETTES.map((palette) => (
                <button
                  key={palette.name}
                  onClick={() => { setPalette(palette); setOpen(false) }}
                  className="flex items-center gap-3 w-full px-2.5 py-2 rounded-lg text-sm text-left cursor-pointer transition-colors hover:bg-gray-50"
                >
                  <div className="flex gap-1 flex-shrink-0">
                    <div
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ background: palette.wine }}
                    />
                    <div
                      className="w-4 h-4 rounded-full border border-black/10"
                      style={{ background: palette.cream }}
                    />
                  </div>
                  <span className="flex-1" style={{ color: 'var(--color-black)' }}>{palette.name}</span>
                  {activePalette.name === palette.name && (
                    <Check size={13} style={{ color: 'var(--color-wine)' }} />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t p-1.5" style={{ borderTopColor: 'var(--color-gray-border)' }}>
              <button
                onClick={() => { resetPalette(); setOpen(false) }}
                className="flex items-center gap-2 w-full px-2.5 py-2 rounded-lg text-sm cursor-pointer transition-colors hover:bg-gray-50"
                style={{ color: 'var(--color-gray-text)' }}
              >
                <RotateCcw size={13} />
                Restaurar padrão
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

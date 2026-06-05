import { useEffect, useRef, useCallback, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowUpIcon, Paperclip, X, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

function useAutoResizeTextarea({ minHeight, maxHeight }: { minHeight: number; maxHeight?: number }) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const adjustHeight = useCallback((reset?: boolean) => {
    const ta = textareaRef.current;
    if (!ta) return;
    if (reset) { ta.style.height = `${minHeight}px`; return; }
    ta.style.height = `${minHeight}px`;
    ta.style.height = `${Math.max(minHeight, Math.min(ta.scrollHeight, maxHeight ?? Infinity))}px`;
  }, [minHeight, maxHeight]);
  useEffect(() => { if (textareaRef.current) textareaRef.current.style.height = `${minHeight}px`; }, [minHeight]);
  return { textareaRef, adjustHeight };
}

interface AnimatedAIChatProps {
  value: string;
  onChange: (v: string) => void;
  onSubmit: () => void;
  loading?: boolean;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
}

export function AnimatedAIChat({ value, onChange, onSubmit, loading, placeholder, disabled, className }: AnimatedAIChatProps) {
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 56, maxHeight: 200 });
  const [focused, setFocused] = useState(false);

  function handleKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && (e.metaKey || e.ctrlKey) && !loading) {
      e.preventDefault();
      onSubmit();
    }
  }

  return (
    <div className={cn("relative w-full", className)}>
      {/* Glow ring when focused */}
      <AnimatePresence>
        {focused && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className="absolute inset-0 rounded-2xl pointer-events-none"
            style={{
              boxShadow: '0 0 0 2px rgba(196,105,122,0.4), 0 0 24px rgba(107,45,62,0.3)',
              zIndex: 0,
            }}
          />
        )}
      </AnimatePresence>

      <div
        className="relative flex flex-col rounded-2xl overflow-hidden"
        style={{
          background: 'rgba(255,255,255,0.06)',
          border: '1px solid rgba(255,255,255,0.12)',
          backdropFilter: 'blur(20px)',
          zIndex: 1,
        }}
      >
        {/* Sparkle header hint */}
        {!value && !focused && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="absolute top-3 left-4 flex items-center gap-1.5 pointer-events-none"
          >
            <Sparkles size={12} style={{ color: 'var(--color-wine-light)' }} />
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.35)' }}>
              {placeholder ?? 'Descreva o que precisa...'}
            </span>
          </motion.div>
        )}

        <textarea
          ref={textareaRef}
          value={value}
          onChange={(e) => { onChange(e.target.value); adjustHeight(); }}
          onKeyDown={handleKey}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          disabled={disabled || loading}
          placeholder=""
          className="w-full resize-none outline-none px-4 pt-4 pb-2 text-sm leading-relaxed"
          style={{
            background: 'transparent',
            color: 'rgba(255,255,255,0.9)',
            minHeight: 56,
            caretColor: 'var(--color-wine-light)',
          }}
        />

        {/* Bottom toolbar */}
        <div className="flex items-center justify-between px-3 pb-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="p-1.5 rounded-lg cursor-pointer transition-colors hover:bg-white/10"
              style={{ color: 'rgba(255,255,255,0.4)' }}
            >
              <Paperclip size={14} />
            </button>
            <span className="text-xs" style={{ color: 'rgba(255,255,255,0.2)' }}>
              ⌘+Enter para enviar
            </span>
          </div>

          <motion.button
            type="button"
            onClick={!loading ? onSubmit : undefined}
            disabled={!value.trim() || loading || disabled}
            whileTap={{ scale: 0.92 }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium cursor-pointer transition-all disabled:opacity-40"
            style={{
              background: value.trim() && !loading
                ? 'var(--color-cream-warm)'
                : 'rgba(255,255,255,0.1)',
              color: value.trim() && !loading
                ? 'var(--color-wine)'
                : 'rgba(255,255,255,0.4)',
            }}
          >
            {loading ? (
              <><Loader2 size={12} className="animate-spin" /> Gerando...</>
            ) : (
              <><ArrowUpIcon size={12} /> Gerar</>
            )}
          </motion.button>
        </div>
      </div>
    </div>
  );
}

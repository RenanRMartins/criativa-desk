import React, { useEffect, useRef, ReactNode } from 'react';

interface GlowCardProps {
  children: ReactNode;
  className?: string;
  glowColor?: 'wine' | 'blue' | 'purple' | 'green' | 'gold';
  customSize?: boolean;
}

const glowColorMap = {
  wine:   { base: 340, spread: 40 },
  blue:   { base: 220, spread: 200 },
  purple: { base: 280, spread: 300 },
  green:  { base: 120, spread: 200 },
  gold:   { base: 42,  spread: 20 },
};

const GlowCard: React.FC<GlowCardProps> = ({
  children, className = '', glowColor = 'wine', customSize = true,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const syncPointer = (e: PointerEvent) => {
      const { clientX: x, clientY: y } = e;
      if (cardRef.current) {
        cardRef.current.style.setProperty('--x', x.toFixed(2));
        cardRef.current.style.setProperty('--xp', (x / window.innerWidth).toFixed(2));
        cardRef.current.style.setProperty('--y', y.toFixed(2));
        cardRef.current.style.setProperty('--yp', (y / window.innerHeight).toFixed(2));
      }
    };
    document.addEventListener('pointermove', syncPointer);
    return () => document.removeEventListener('pointermove', syncPointer);
  }, []);

  const { base, spread } = glowColorMap[glowColor];

  const inlineStyles = {
    '--base': base,
    '--spread': spread,
    '--radius': '16',
    '--border': '2',
    '--backdrop': 'rgba(255,255,255,0.04)',
    '--backup-border': 'rgba(255,255,255,0.08)',
    '--size': '220',
    '--outer': '1',
    '--border-size': 'calc(var(--border, 2) * 1px)',
    '--spotlight-size': 'calc(var(--size, 150) * 1px)',
    '--hue': 'calc(var(--base) + (var(--xp, 0) * var(--spread, 0)))',
    backgroundImage: `radial-gradient(
      var(--spotlight-size) var(--spotlight-size) at
      calc(var(--x, 0) * 1px) calc(var(--y, 0) * 1px),
      hsl(var(--hue, 340) 80% 60% / 0.08), transparent
    )`,
    backgroundColor: 'var(--backdrop, transparent)',
    backgroundAttachment: 'fixed',
    border: 'var(--border-size) solid var(--backup-border)',
    position: 'relative' as const,
    touchAction: 'none' as const,
  } as React.CSSProperties;

  const css = `
    [data-glow]::before, [data-glow]::after {
      pointer-events:none; content:""; position:absolute;
      inset:calc(var(--border-size)*-1); border:var(--border-size) solid transparent;
      border-radius:calc(var(--radius)*1px); background-attachment:fixed;
      background-size:calc(100% + (2 * var(--border-size))) calc(100% + (2 * var(--border-size)));
      background-repeat:no-repeat; background-position:50% 50%;
      mask:linear-gradient(transparent,transparent),linear-gradient(white,white);
      mask-clip:padding-box,border-box; mask-composite:intersect;
    }
    [data-glow]::before {
      background-image:radial-gradient(
        calc(var(--spotlight-size)*0.75) calc(var(--spotlight-size)*0.75) at
        calc(var(--x,0)*1px) calc(var(--y,0)*1px),
        hsl(var(--hue,340) 80% 55% / 0.9), transparent 100%
      );
      filter:brightness(1.8);
    }
    [data-glow]::after {
      background-image:radial-gradient(
        calc(var(--spotlight-size)*0.5) calc(var(--spotlight-size)*0.5) at
        calc(var(--x,0)*1px) calc(var(--y,0)*1px),
        hsl(0 100% 100% / 0.7), transparent 100%
      );
    }
  `;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: css }} />
      <div
        ref={cardRef}
        data-glow
        style={inlineStyles}
        className={`rounded-2xl relative shadow-card backdrop-blur-sm ${className}`}
      >
        <div data-glow className="absolute inset-0 rounded-2xl" style={{ opacity: 'var(--outer,1)', willChange: 'filter', filter: 'blur(8px)', background: 'none', pointerEvents: 'none', border: 'none' }} />
        {children}
      </div>
    </>
  );
};

export { GlowCard };

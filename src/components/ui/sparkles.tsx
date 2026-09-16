import { useId } from "react";
import Particles, { ParticlesProvider } from "@tsparticles/react";
import type { Engine } from "@tsparticles/engine";
import { loadSlim } from "@tsparticles/slim";
import { cn } from "@/lib/utils";

type ParticlesProps = {
  id?: string;
  className?: string;
  background?: string;
  minSize?: number;
  maxSize?: number;
  speed?: number;
  particleColor?: string;
  particleDensity?: number;
};

async function initEngine(engine: Engine) {
  await loadSlim(engine);
}

/**
 * Enfeite custa caro: a animação roda em canvas, quadro a quadro, sem parar.
 * Num tablet isso concorre com a interface inteira — e é onde a social media
 * trabalha. Em tela sensível ao toque, ou com "reduzir movimento" ligado, as
 * partículas simplesmente não entram; no resto, 30fps bastam para o efeito.
 */
function enfeiteValeAPena() {
  if (typeof window === 'undefined' || !window.matchMedia) return true;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return !window.matchMedia('(pointer: coarse)').matches;
}

export function SparklesCore(props: ParticlesProps) {
  const { id, className, background, minSize, maxSize, speed, particleColor, particleDensity } = props;
  const generatedId = useId();

  if (!enfeiteValeAPena()) return null;

  return (
    <ParticlesProvider init={initEngine}>
      <Particles
        id={id || generatedId}
        className={cn("opacity-100", className)}
        options={{
          background: { color: { value: background || "transparent" } },
          fullScreen: { enable: false },
          fpsLimit: 30,   // 120 fazia o canvas redesenhar 120x/s por pura decoração
          particles: {
            color: { value: particleColor || "#ffffff" },
            move: {
              direction: "none",
              enable: true,
              outModes: { default: "out" },
              random: false,
              speed: { min: 0.1, max: speed || 1 },
              straight: false,
            },
            number: {
              density: { enable: true, width: 400, height: 400 },
              value: particleDensity || 80,
            },
            opacity: {
              value: { min: 0.1, max: 0.9 },
              animation: { enable: true, speed: speed || 3, sync: false },
            },
            shape: { type: "circle" },
            size: {
              value: { min: minSize || 1, max: maxSize || 3 },
            },
          },
          detectRetina: true,
        }}
      />
    </ParticlesProvider>
  );
}

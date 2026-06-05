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

export function SparklesCore(props: ParticlesProps) {
  const { id, className, background, minSize, maxSize, speed, particleColor, particleDensity } = props;
  const generatedId = useId();

  return (
    <ParticlesProvider init={initEngine}>
      <Particles
        id={id || generatedId}
        className={cn("opacity-100", className)}
        options={{
          background: { color: { value: background || "transparent" } },
          fullScreen: { enable: false },
          fpsLimit: 120,
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

import type { Variants } from 'motion/react'

export const pageVariants: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.25, ease: [0.0, 0.0, 0.2, 1] } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.15 } },
}

export const containerVariants: Variants = {
  animate: { transition: { staggerChildren: 0.05 } },
}

export const cardVariants: Variants = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.22, ease: [0.0, 0.0, 0.2, 1] } },
}

export const slideVariants: Variants = {
  initial: { opacity: 0, x: 40 },
  animate: { opacity: 1, x: 0, transition: { duration: 0.3, ease: [0.0, 0.0, 0.2, 1] } },
  exit: { opacity: 0, x: -40, transition: { duration: 0.2 } },
}

export const drawerVariants: Variants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: { duration: 0.25, ease: [0.0, 0.0, 0.2, 1] } },
  exit: { x: '100%', transition: { duration: 0.2 } },
}

/**
 * usePageTransition — Framer Motion variants for page transitions
 * Use in any page component for consistent entry animations
 */

export function usePageTransition(variant = 'default') {
  const variants = {
    default: {
      initial: { opacity: 0, y: 16 },
      animate: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.5, ease: [0.16, 1, 0.3, 1] },
      },
      exit: {
        opacity: 0,
        y: -8,
        transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
      },
    },

    slide: {
      initial: { opacity: 0, x: 24 },
      animate: {
        opacity: 1,
        x: 0,
        transition: { duration: 0.45, ease: [0.16, 1, 0.3, 1] },
      },
      exit: {
        opacity: 0,
        x: -24,
        transition: { duration: 0.2, ease: [0.4, 0, 0.2, 1] },
      },
    },

    scale: {
      initial: { opacity: 0, scale: 0.97 },
      animate: {
        opacity: 1,
        scale: 1,
        transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
      },
      exit: {
        opacity: 0,
        scale: 0.97,
        transition: { duration: 0.2 },
      },
    },

    fade: {
      initial: { opacity: 0 },
      animate: {
        opacity: 1,
        transition: { duration: 0.35 },
      },
      exit: {
        opacity: 0,
        transition: { duration: 0.2 },
      },
    },
  }

  /* ── Stagger children helper ── */
  const staggerContainer = {
    animate: {
      transition: { staggerChildren: 0.07, delayChildren: 0.1 },
    },
  }

  const staggerItem = {
    initial: { opacity: 0, y: 12 },
    animate: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, ease: [0.16, 1, 0.3, 1] },
    },
  }

  return {
    variants: variants[variant] || variants.default,
    staggerContainer,
    staggerItem,
  }
}
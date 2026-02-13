export const easings = {
  easeOut: [0.16, 1, 0.3, 1] as const,
  easeInOut: [0.45, 0, 0.55, 1] as const,
  spring: { type: "spring", stiffness: 400, damping: 30 } as const,
  springGentle: { type: "spring", stiffness: 300, damping: 25 } as const,
  springBouncy: {
    type: "spring",
    stiffness: 500,
    damping: 25,
    mass: 0.5
  } as const
};

export const durations = {
  fast: 0.15,
  normal: 0.25,
  slow: 0.4,
  slower: 0.6
} as const;

export const pageVariants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 }
} as const;


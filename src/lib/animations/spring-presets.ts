import type { Transition } from "framer-motion";

export const snappy: Transition = { type: "spring", stiffness: 300, damping: 25 };
export const gentle: Transition = { type: "spring", stiffness: 150, damping: 20 };
export const bouncy: Transition = { type: "spring", stiffness: 400, damping: 15 };
export const fade: Transition = { duration: 0.2, ease: "easeOut" };
export const DURATION = { fast: 0.15, normal: 0.2, slow: 0.3 } as const;

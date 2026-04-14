/**
 * Animation class helpers for consistent UI transitions across VizPortal.
 * These reference CSS classes defined in globals.css.
 */

/** Fade in + slide up — use on top-level page wrappers */
export const fadeInUp = "animate-fade-in-up";

/** Simple fade in — lighter alternative */
export const fadeIn = "animate-fade-in";

/**
 * Stagger children animation — apply to a grid/list container.
 * Each direct child gets a progressively delayed fadeInUp.
 */
export const stagger = "animate-stagger";

/** Card hover lift effect */
export const cardHover = "card-hover";

/** Table row hover transition */
export const rowHover = "row-hover";

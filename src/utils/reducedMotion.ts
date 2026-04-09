/**
 * Reduced motion helper — respects prefers-reduced-motion.
 */

export function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function onMotionPreferenceChange(callback: (reduced: boolean) => void): void {
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", (e) => callback(e.matches));
}

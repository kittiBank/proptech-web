/**
 * Single background layer for the hero.
 *
 * Reserved for the upcoming hero animation (canvas, Lottie or video): replace
 * the contents of this component and keep it `absolute inset-0 -z-10` so the
 * headline and search stay on top. Respect `prefers-reduced-motion` when the
 * animation lands. The solid colour below is the fallback/poster state.
 */
export function HeroBackground() {
  return <div data-slot="hero-background" aria-hidden="true" className="absolute inset-0 -z-10 bg-hero" />;
}

/**
 * Shared surface for clickable listing cards (property, project).
 *
 * The card holds one stretched link. Hover lifts the card, darkens the border
 * and slowly zooms the photo; keyboard focus on that link shows the same lift
 * plus a brand outline, so mouse and keyboard users get the same feedback.
 * Motion is disabled globally under prefers-reduced-motion (globals.css).
 */
export const interactiveCard =
  "group relative flex flex-col overflow-hidden rounded-lg border border-line bg-white transition-[border-color,box-shadow,translate] duration-200 ease-out hover:-translate-y-1 hover:border-line-strong hover:shadow-[0_16px_32px_-16px_rgb(26_22_48/0.25)] has-[[data-card-link]:focus-visible]:-translate-y-1 has-[[data-card-link]:focus-visible]:shadow-[0_16px_32px_-16px_rgb(26_22_48/0.25)] has-[[data-card-link]:focus-visible]:outline-2 has-[[data-card-link]:focus-visible]:outline-offset-2 has-[[data-card-link]:focus-visible]:outline-brand";

/** Stretched link that makes the whole card clickable; pair with `data-card-link`. */
export const cardLink = "after:absolute after:inset-0 focus-visible:outline-none";

/** Photo zoom on card hover/focus. Apply to the image inside an `overflow-hidden` frame. */
export const cardImageZoom =
  "transition-transform duration-500 ease-out group-hover:scale-[1.04] group-has-[[data-card-link]:focus-visible]:scale-[1.04]";

/** Title colour shift on hover/focus. */
export const cardTitle = "transition-colors group-hover:text-brand-strong";

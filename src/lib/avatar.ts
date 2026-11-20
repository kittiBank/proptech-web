/** Helpers for `Avatar`: which letter to show and which colour to use for a name. */

const HONORIFICS = /^(บริษัท|คุณ|นาย|นางสาว|นาง|Mr\.?|Mrs\.?|Ms\.?)\s*/i;

/**
 * First letter of a name, skipping honorifics and Thai leading vowels (เ แ โ ใ ไ)
 * so "เกียรติ" shows "ก" rather than a floating vowel. "?" when nothing usable.
 */
export function nameInitial(name: string): string {
  const letter = name
    .trim()
    .replace(HONORIFICS, "")
    .match(/[ก-ฮA-Za-z0-9]/);
  return letter ? letter[0].toUpperCase() : "?";
}

/** Fill colours that keep white text above AA. Transit colours are excluded on purpose. */
export const avatarColours = ["bg-brand", "bg-ink", "bg-violet-700", "bg-hero", "bg-brand-strong"] as const;

/** Stable colour for a name, so one person gets the same avatar everywhere. */
export function avatarColour(name: string): (typeof avatarColours)[number] {
  let hash = 0;
  for (const ch of name) hash = (hash * 31 + ch.codePointAt(0)!) | 0;
  return avatarColours[Math.abs(hash) % avatarColours.length];
}

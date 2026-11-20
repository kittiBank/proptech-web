/** Contact helpers shared by the listing poster card and agent profiles. */

/** 02-000-1101 → 02-000-11xx until the visitor asks for the number. */
export const maskPhone = (phone: string) => phone.replace(/\d{2}$/, "xx");

/** `tel:` link with digits only. */
export const telHref = (phone: string) => `tel:${phone.replace(/\D/g, "")}`;

/** Opens the LINE add-friend page for a LINE ID. */
export const lineHref = (lineId: string) => `https://line.me/R/ti/p/~${encodeURIComponent(lineId)}`;

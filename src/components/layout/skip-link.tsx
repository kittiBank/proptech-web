/** First focusable element on pages with navigation before `<main id="main">` (WCAG 2.4.1). */
export function SkipLink() {
  return (
    <a
      href="#main"
      className="sr-only z-50 rounded-md bg-ink px-4 py-3 text-white focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
    >
      ข้ามไปยังเนื้อหาหลัก
    </a>
  );
}

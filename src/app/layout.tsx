import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/dm-sans";
import "@fontsource/ibm-plex-sans-thai/thai-400.css";
import "@fontsource/ibm-plex-sans-thai/thai-500.css";
import "@fontsource/ibm-plex-sans-thai/thai-600.css";
import "./globals.css";
import { CookieConsent } from "@/components/consent/cookie-consent";
import { Toaster } from "@/components/ui/toast";
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ซื้อ ขาย เช่า บ้านและคอนโดในกรุงเทพฯ`,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  applicationName: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "th_TH",
  },
  twitter: { card: "summary_large_image" },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="flex min-h-full flex-col">
        {children}
        <Toaster />
        {/* D7: global, on every page including the dashboard and checkout. */}
        <CookieConsent />
      </body>
    </html>
  );
}

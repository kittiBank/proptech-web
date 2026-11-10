import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "@fontsource-variable/dm-sans";
import "@fontsource/ibm-plex-sans-thai/thai-400.css";
import "@fontsource/ibm-plex-sans-thai/thai-500.css";
import "@fontsource/ibm-plex-sans-thai/thai-600.css";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "PropertyHub — ซื้อ ขาย เช่า บ้านและคอนโดในกรุงเทพฯ",
    template: "%s | PropertyHub",
  },
  description:
    "ค้นหาบ้าน คอนโด ทาวน์โฮม ที่ดิน และอาคารพาณิชย์กว่า 96,000 ประกาศทั่วกรุงเทพฯ พร้อมระยะเดินถึง BTS และ MRT",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="th" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}

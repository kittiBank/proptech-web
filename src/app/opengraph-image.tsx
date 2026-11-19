import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

/**
 * Default share image for every page without its own (listings, projects and
 * articles use their cover photo instead). Rendered once at build time.
 */
export const alt = "PropertyHub — ซื้อ ขาย เช่า บ้านและคอนโดในกรุงเทพฯ";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// Satori reads .woff/.ttf, not .woff2. IBM Plex Sans Thai covers both Thai and Latin.
const fontDir = join(process.cwd(), "node_modules/@fontsource/ibm-plex-sans-thai/files");
const loadFont = (subset: "thai" | "latin") => readFile(join(fontDir, `ibm-plex-sans-thai-${subset}-600-normal.woff`));

export default async function OpengraphImage() {
  const [thai, latin] = await Promise.all([loadFont("thai"), loadFont("latin")]);
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: 72,
        background: "linear-gradient(135deg, #261A5C 0%, #4424A8 100%)",
        color: "#fff",
        fontFamily: "IBM Plex Sans Thai",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 44 }}>
        <svg viewBox="0 0 32 32" width="72" height="72">
          <rect width="32" height="32" rx="6" fill="#7047EB" />
          <path d="M11 25V15.5a5 5 0 0 1 10 0V25" fill="none" stroke="#fff" strokeWidth="3" />
          <rect x="7" y="24" width="18" height="3" fill="#fff" />
        </svg>
        <span>
          Property<span style={{ color: "#CBBCFA" }}>Hub</span>
        </span>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        <div style={{ fontSize: 68, lineHeight: 1.25 }}>ซื้อ ขาย เช่า บ้านและคอนโดในกรุงเทพฯ</div>
        <div style={{ fontSize: 32, color: "#D9CEFF" }}>ทุกประกาศบอกระยะเดินถึง BTS และ MRT</div>
      </div>
    </div>,
    {
      ...size,
      fonts: [
        { name: "IBM Plex Sans Thai", data: thai, style: "normal", weight: 600 },
        { name: "IBM Plex Sans Thai", data: latin, style: "normal", weight: 600 },
      ],
    },
  );
}

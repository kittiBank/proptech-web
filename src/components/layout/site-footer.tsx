import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import { contact, footerNav } from "@/data/navigation";
import { Logo } from "./logo";

const socialLinks = [
  { label: "Facebook", href: "https://facebook.com" },
  { label: "LINE Official", href: "https://line.me" },
  { label: "Instagram", href: "https://instagram.com" },
  { label: "YouTube", href: "https://youtube.com" },
];

export function SiteFooter() {
  return (
    <footer className="bg-ink text-white">
      <div className="mx-auto grid max-w-[1280px] gap-12 px-4 pt-16 pb-10 sm:px-6 lg:grid-cols-[1.3fr_2fr] lg:px-8">
        <div className="flex flex-col gap-6">
          <Logo inverted />
          <p className="max-w-sm text-[15px] leading-relaxed text-white/70">
            ตลาดซื้อ ขาย เช่าบ้านและคอนโดสำหรับคนกรุงเทพฯ ทุกประกาศแสดงระยะเดินถึงสถานีและราคาต่อตารางเมตร
          </p>
          <address className="flex flex-col gap-3 text-[15px] text-white/80 not-italic">
            <a
              href={`tel:${contact.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-3 hover:text-white"
            >
              <Phone className="size-4 text-violet-200" aria-hidden="true" />
              {contact.phone}
              <span className="text-white/60">{contact.hours}</span>
            </a>
            <a href={`mailto:${contact.email}`} className="inline-flex items-center gap-3 hover:text-white">
              <Mail className="size-4 text-violet-200" aria-hidden="true" />
              {contact.email}
            </a>
            <span className="inline-flex items-start gap-3">
              <MapPin className="mt-1 size-4 shrink-0 text-violet-200" aria-hidden="true" />
              {contact.address}
            </span>
          </address>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-10 sm:grid-cols-3">
          {footerNav.map((group) => (
            <nav key={group.title} aria-label={group.title}>
              <h2 className="mb-4 text-sm font-semibold text-white">{group.title}</h2>
              <ul className="flex flex-col gap-1">
                {group.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="inline-flex min-h-9 items-center text-[15px] text-white/70 hover:text-white"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-[1280px] flex-col gap-4 px-4 py-6 text-sm text-white/60 sm:px-6 md:flex-row md:items-center md:justify-between lg:px-8">
          <p>© 2026 PropertyHub Co., Ltd. สงวนลิขสิทธิ์</p>
          <ul className="flex flex-wrap gap-x-5 gap-y-2" aria-label="โซเชียลมีเดีย">
            {socialLinks.map((s) => (
              <li key={s.label}>
                <a href={s.href} target="_blank" rel="noopener noreferrer" className="hover:text-white">
                  {s.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}

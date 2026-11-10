import Link from "next/link";
import { Button } from "@/components/ui/button";
import { routes } from "@/data/navigation";
import { Container } from "./section-header";

const steps = [
  { title: "กรอกรายละเอียดและราคา", body: "ระบบแนะนำราคาจากประกาศในโครงการเดียวกัน" },
  { title: "อัปโหลดรูปภาพ", body: "สูงสุด 30 รูป ลากเรียงลำดับได้" },
  { title: "ยืนยันเบอร์โทรศัพท์", body: "ประกาศขึ้นทันที ผู้สนใจติดต่อคุณโดยตรง" },
];

export function PostCta() {
  return (
    <section aria-labelledby="cta-title" className="py-16 sm:py-20 lg:py-24">
      <Container>
        <div className="grid overflow-hidden rounded-lg bg-brand text-white lg:grid-cols-2">
          <div className="flex flex-col gap-6 p-8 sm:p-12">
            <h2 id="cta-title" className="text-[30px] leading-[1.25] font-semibold tracking-[-0.015em] sm:text-[40px]">
              มีบ้านหรือคอนโด
              <br />
              ที่อยากขายหรือปล่อยเช่า
            </h2>
            <p className="max-w-[44ch] text-[17px] leading-relaxed text-white/85">
              เจ้าของลงประกาศได้ฟรี 3 ประกาศ นายหน้าจัดการหลายประกาศพร้อมกันและดูสถิติผู้เข้าชมได้จากแดชบอร์ดเดียว
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="light" size="lg">
                <Link href={routes.postProperty}>ลงประกาศฟรี</Link>
              </Button>
              <Button asChild size="lg" className="border border-white/50 bg-transparent hover:bg-white/10">
                <Link href={`${routes.postProperty}?for=agent`}>สมัครแพ็กเกจนายหน้า</Link>
              </Button>
            </div>
          </div>

          <ol className="flex flex-col justify-center gap-0 border-t border-white/20 bg-violet-600 p-8 sm:p-12 lg:border-t-0 lg:border-l">
            {steps.map((step, i) => (
              <li key={step.title} className="flex gap-5 border-b border-white/15 py-5 first:pt-0 last:border-b-0 last:pb-0">
                <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-full border border-white/50 text-[15px] font-semibold tabular-nums">
                  {i + 1}
                </span>
                <div>
                  <p className="text-lg font-medium">{step.title}</p>
                  <p className="mt-1 text-[15px] text-white/80">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </Container>
    </section>
  );
}

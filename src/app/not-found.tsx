import Link from "next/link";
import { LogoMark } from "@/components/layout/logo";
import { SiteShell } from "@/components/layout/site-shell";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <SiteShell>
      <div className="mx-auto flex min-h-[70vh] max-w-[560px] flex-col items-start justify-center gap-6 px-4 py-20">
        <LogoMark className="size-10" />
        <div>
          <h1 className="text-[32px] leading-tight font-semibold tracking-[-0.015em] text-ink">
            หน้านี้กำลังจะเปิดให้บริการ
          </h1>
          <p className="mt-3 text-[17px] leading-relaxed text-slate">
            เรากำลังสร้างหน้านี้อยู่ ระหว่างนี้คุณค้นหาประกาศ ดูทำเลตามสายรถไฟฟ้า และบันทึกรายการโปรดได้จากหน้าแรก
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/">กลับหน้าแรก</Link>
        </Button>
      </div>
    </SiteShell>
  );
}

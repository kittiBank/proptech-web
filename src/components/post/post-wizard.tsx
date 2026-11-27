"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { ChevronLeft, CircleAlert, CloudCheck, CloudOff, FileQuestion, LoaderCircle, LogIn } from "lucide-react";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { FormAlert } from "@/components/ui/field";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { routes } from "@/data/navigation";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { draftQueries, listingQuotaQuery, nearbyStationsQuery, queryKeys } from "@/lib/api/queries";
import { formatNumber } from "@/lib/format";
import {
  isPostStep,
  nextStep,
  previousStep,
  promotionCatalog,
  reachableSteps,
  stepErrors,
  type StepErrors,
} from "@/lib/post-wizard";
import { cn } from "@/lib/utils";
import { useSession } from "@/providers/session";
import type { DraftDto, DraftValues, PostStep } from "@/types/api";
import { ListingPreviewCard } from "./preview-card";
import { DetailsStep } from "./steps/details-step";
import { LocationStep } from "./steps/location-step";
import { PhotosStep } from "./steps/photos-step";
import { PublishStep } from "./steps/publish-step";
import type { StepProps } from "./steps/shared";
import { TypeStep } from "./steps/type-step";
import { SkipLink } from "@/components/layout/skip-link";
import { MobileStepper, Stepper } from "./stepper";
import { useDraftEditor, type SaveState } from "./use-draft-editor";

const stepComponents: Record<PostStep, (props: StepProps) => ReactNode> = {
  type: TypeStep,
  location: LocationStep,
  details: DetailsStep,
  photos: PhotosStep,
  publish: PublishStep,
};

const intro: Record<PostStep, { title: string; body: string }> = {
  type: { title: "ลงประกาศขายหรือให้เช่า", body: "บอกเราว่าคุณเป็นใครและจะลงประกาศอะไร ใช้เวลาทั้งหมดประมาณ 10 นาที" },
  location: { title: "ทรัพย์อยู่ที่ไหน", body: "ทำเลและระยะถึงสถานีคือสิ่งแรกที่ผู้หาบ้านใช้กรอง" },
  details: {
    title: "รายละเอียดทรัพย์",
    body: "ข้อมูลที่มีเครื่องหมาย * จำเป็นต้องกรอก ที่เหลือช่วยให้ประกาศขึ้นในตัวกรองมากขึ้น",
  },
  photos: { title: "รูปภาพ", body: "รูปคือสิ่งที่ทำให้คนกดเข้ามาดู ถ่ายตอนกลางวัน เปิดไฟและม่านทุกบาน" },
  publish: {
    title: "ราคาและเผยแพร่",
    body: "ตั้งราคา เลือกโปรโมต แล้วตรวจข้อมูลอีกครั้ง ทีมงานตรวจประกาศภายใน 2 ชม. ในเวลาทำการ",
  },
};

const tips: Record<PostStep, { title: string; body: string }> = {
  type: {
    title: "ลงฟรี ไม่มีค่าคอมมิชชัน",
    body: "PropertyHub ไม่เก็บค่าคอมมิชชันจากการขายหรือเช่า จ่ายเฉพาะเมื่อเลือกโปรโมตประกาศ",
  },
  location: {
    title: "ทำไมต้องปักหมุด",
    body: "ประกาศที่ระบุสถานีได้แสดงในการค้นหาแบบ “ใกล้รถไฟฟ้า” ซึ่งเป็นตัวกรองที่ใช้มากที่สุด",
  },
  details: { title: "หัวข้อที่ได้ผลดี", body: "บอกจุดเด่นที่ค้นหาบ่อย เช่น จำนวนห้องนอน สถานีใกล้เคียง และการตกแต่ง" },
  photos: { title: "รูปที่ได้ผลดี", body: "เริ่มจากห้องนั่งเล่นมุมกว้าง ตามด้วยห้องนอน ครัว ห้องน้ำ วิว และส่วนกลาง" },
  publish: { title: "ตรวจภายใน 2 ชม.", body: "ทีมงานตรวจรูป ราคา และข้อมูลติดต่อ ถ้าต้องแก้ เราจะบอกว่าแก้ตรงไหน" },
};

const timeFormat = new Intl.DateTimeFormat("th-TH", { hour: "2-digit", minute: "2-digit" });

function SaveStatus({ save, onRetry }: { save: SaveState; onRetry: () => void }) {
  return (
    <span role="status" className="inline-flex items-center gap-1.5 text-[13px] text-slate">
      {save.kind === "saving" ? (
        <>
          <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
          กำลังบันทึก...
        </>
      ) : save.kind === "error" ? (
        <>
          <CloudOff className="size-4 text-danger" aria-hidden="true" />
          <span className="text-danger">บันทึกไม่สำเร็จ</span>
          <button
            type="button"
            onClick={onRetry}
            className="font-medium text-brand-strong underline underline-offset-4"
          >
            ลองอีกครั้ง
          </button>
        </>
      ) : save.kind === "saved" ? (
        <>
          <CloudCheck className="size-4 text-success" aria-hidden="true" />
          <span className="hidden sm:inline">บันทึกแบบร่างอัตโนมัติ</span>
          <span className="sm:hidden">บันทึกแล้ว</span> {timeFormat.format(new Date(save.at))}
        </>
      ) : null}
    </span>
  );
}

/** Full-height shell for the wizard routes: centred messages when there is no draft to show. */
export function PostShellMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-mist">
      <header className="border-b border-line bg-white">
        <div className="mx-auto flex h-16 max-w-[1180px] items-center px-4 sm:px-8">
          <Logo />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-[640px] flex-1 px-4 py-10">
        {children}
      </main>
    </div>
  );
}

/** Signed-out visitors see a prompt instead of the wizard. */
export function SignInToPost({ next }: { next: string }) {
  return (
    <PostShellMessage>
      <EmptyState
        icon={LogIn}
        title="เข้าสู่ระบบเพื่อลงประกาศ"
        body="แบบร่างจะบันทึกในบัญชีของคุณ ออกแล้วกลับมาทำต่อได้ทุกเมื่อ ลงประกาศฟรี 2 ประกาศสำหรับเจ้าของ"
        action={
          <Button asChild size="lg">
            <Link href={routes.login({ next })}>เข้าสู่ระบบ</Link>
          </Button>
        }
        secondary={
          <Link
            href={routes.register(next)}
            className="font-medium text-brand-strong underline-offset-4 hover:underline"
          >
            สมัครสมาชิกฟรี
          </Link>
        }
        className="rounded-xl bg-white"
      />
    </PostShellMessage>
  );
}

export function PostWizard() {
  const { draftId, step } = useParams<{ draftId: string; step: string }>();
  const { user, isPending: sessionPending } = useSession();
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    ...draftQueries.detail(draftId),
    enabled: Boolean(user),
  });

  if (sessionPending) return <WizardSkeleton />;
  if (!user) return <SignInToPost next={routes.postStep(draftId, isPostStep(step) ? step : "type")} />;
  if (isPending) return <WizardSkeleton />;
  if (isError) {
    if (error instanceof ApiError && error.status === 404) {
      return (
        <PostShellMessage>
          <EmptyState
            icon={FileQuestion}
            title="ไม่พบแบบร่างนี้"
            body="แบบร่างอาจถูกเผยแพร่หรือลบไปแล้ว เริ่มประกาศใหม่ หรือเลือกแบบร่างอื่นที่ยังทำไม่เสร็จ"
            action={
              <Button asChild size="lg">
                <Link href={routes.postProperty}>ไปที่หน้าลงประกาศ</Link>
              </Button>
            }
            className="rounded-xl bg-white"
          />
        </PostShellMessage>
      );
    }
    return (
      <PostShellMessage>
        <QueryError what="แบบร่าง" onRetry={() => refetch()} retrying={isFetching} />
      </PostShellMessage>
    );
  }
  if (!isPostStep(step)) {
    return (
      <PostShellMessage>
        <EmptyState
          icon={FileQuestion}
          title="ไม่พบขั้นตอนนี้"
          body="ลิงก์อาจพิมพ์ผิด กลับไปทำต่อจากขั้นแรก"
          action={
            <Button asChild>
              <Link href={routes.postStep(draftId, "type")}>กลับไปขั้นแรก</Link>
            </Button>
          }
          className="rounded-xl bg-white"
        />
      </PostShellMessage>
    );
  }
  // One instance per step: touched fields and "show all errors" start fresh on each step,
  // including when Next restores a hidden copy of an earlier step page.
  return <Wizard key={step} draft={data.data} step={step} />;
}

function Wizard({ draft: cached, step }: { draft: DraftDto; step: PostStep }) {
  const router = useRouter();
  const client = useQueryClient();
  // `draft` is the editor's live copy (synchronous for inputs); `cached` is the query cache's.
  const { draft, set, markComplete, flush, save, retry } = useDraftEditor(cached);
  const { values, completedSteps } = draft;
  const reachable = reachableSteps(completedSteps);
  const allowed = reachable.includes(step);
  const [touched, setTouched] = useState<Set<string>>(() => new Set());
  const [showAll, setShowAll] = useState(false);
  const [publishError, setPublishError] = useState<ReactNode>();

  // Users can only reach steps they have completed (plus the next one).
  useEffect(() => {
    if (!allowed) router.replace(routes.postStep(draft.id, reachable[reachable.length - 1]));
  }, [allowed, draft.id, reachable, router]);

  const errors = useMemo(() => stepErrors(step, values), [step, values]);
  const visible: StepErrors = showAll
    ? errors
    : Object.fromEntries(Object.entries(errors).filter(([k]) => touched.has(k)));
  const errorCount = Object.keys(errors).length;

  const firstStation = usePreviewStation(values);

  const promotion = promotionCatalog.find((p) => p.id === values.promotion);
  const paid = Boolean(promotion && promotion.price > 0);

  const touch = (field: string) => setTouched((t) => (t.has(field) ? t : new Set(t).add(field)));

  const revealErrors = () => {
    setShowAll(true);
    const first = Object.keys(errors)[0];
    document.getElementById(`field-${first}`)?.scrollIntoView({ block: "start", behavior: "smooth" });
  };

  const publish = useMutation({
    mutationFn: async (override?: Partial<DraftValues>) => {
      if (override) set(override);
      await flush();
      return api.publishDraft(draft.id);
    },
    onSuccess: ({ data }) => {
      void client.invalidateQueries({ queryKey: queryKeys.drafts.all });
      void client.invalidateQueries({ queryKey: listingQuotaQuery.queryKey });
      router.push(data.order ? routes.checkout(data.order.id) : routes.postDone(draft.id));
    },
    onError: (err) => {
      const message = err instanceof ApiError ? String(err.body?.message ?? "") : "";
      setPublishError(
        message === "kyc_required" ? (
          <>
            นายหน้าต้องยืนยันตัวตนก่อนเผยแพร่{" "}
            <Link href="/dashboard/verify" className="font-medium underline underline-offset-4">
              ยืนยันตัวตน
            </Link>{" "}
            แบบร่างนี้ยังบันทึกไว้
          </>
        ) : message === "free_quota_exceeded" ? (
          "ใช้โควตาประกาศฟรีครบ 2 รายการแล้ว เลือกโปรโมตประกาศ หรือปิดประกาศเดิมก่อน"
        ) : err instanceof ApiError && err.status === 422 ? (
          "ข้อมูลบางขั้นยังไม่ครบ ตรวจขั้นที่มีเครื่องหมายอีกครั้ง"
        ) : (
          "เผยแพร่ไม่สำเร็จ ลองอีกครั้ง แบบร่างยังบันทึกไว้"
        ),
      );
    },
  });

  const goNext = () => {
    if (errorCount > 0) {
      revealErrors();
      return;
    }
    markComplete(step);
    const target = nextStep(step);
    void flush().catch(() => {});
    if (target) router.push(routes.postStep(draft.id, target));
  };

  const doPublish = (free = false) => {
    setPublishError(undefined);
    const checkValues = free ? { ...values, promotion: "none" as const } : values;
    if (Object.keys(stepErrors("publish", checkValues)).length > 0) {
      revealErrors();
      return;
    }
    publish.mutate(free ? { promotion: "none" } : undefined);
  };

  if (!allowed) return <WizardSkeleton />;

  const stepHref = (s: PostStep) => routes.postStep(draft.id, s);
  const StepComponent = stepComponents[step];
  const back = previousStep(step);

  return (
    <WizardFrame
      label="ลงประกาศ"
      step={step}
      backHref={back && stepHref(back)}
      status={<SaveStatus save={save} onRetry={retry} />}
      exit={
        <Link
          href={routes.home}
          onClick={() => void flush().catch(() => {})}
          className="inline-flex h-11 items-center px-2 text-sm font-medium text-brand-strong underline-offset-4 hover:underline"
        >
          <span className="hidden sm:inline">ออกและทำต่อทีหลัง</span>
          <span className="sm:hidden">ทำต่อทีหลัง</span>
        </Link>
      }
      stepper={<Stepper hrefFor={stepHref} current={step} completed={completedSteps} reachable={reachable} />}
      preview={<ListingPreviewCard values={values} station={firstStation} />}
      note={
        showAll && errorCount > 0 ? (
          <div className="rounded-lg border border-danger-line bg-danger-soft p-4 text-sm text-danger">
            <p className="font-semibold">แก้ไข {errorCount} จุดก่อนไปต่อ</p>
            <p className="mt-1">{Object.values(errors)[0]}</p>
          </div>
        ) : step === "publish" && paid ? (
          <div className="rounded-lg border border-line bg-white p-4 text-sm">
            <p className="font-semibold text-ink">ยอดชำระ ฿{formatNumber(promotion!.price)}</p>
            <p className="mt-1 text-slate">
              {promotion!.title} เริ่มนับเมื่อประกาศผ่านการตรวจ ถ้าไม่ผ่านคืนเงินเต็มจำนวน
            </p>
          </div>
        ) : (
          <TipCard step={step} />
        )
      }
      footer={
        <>
          {back ? (
            <Button asChild variant="outline" size="lg">
              <Link href={stepHref(back)}>ย้อนกลับ</Link>
            </Button>
          ) : (
            <span />
          )}
          <div className="ml-auto flex items-center gap-3">
            {showAll && errorCount > 0 && (
              <span className="hidden text-sm font-medium text-danger sm:inline" aria-live="polite">
                เหลือ {errorCount} ช่องที่ต้องแก้
              </span>
            )}
            {step === "publish" ? (
              <>
                {paid && (
                  <span className="hidden text-sm text-slate sm:inline">
                    หรือ{" "}
                    <button
                      type="button"
                      onClick={() => doPublish(true)}
                      disabled={publish.isPending}
                      className="font-medium text-brand-strong underline underline-offset-4"
                    >
                      เผยแพร่แบบฟรี
                    </button>
                  </span>
                )}
                <Button size="lg" onClick={() => doPublish()} disabled={publish.isPending} className="font-semibold">
                  {publish.isPending
                    ? "กำลังส่ง..."
                    : paid
                      ? `ชำระ ฿${formatNumber(promotion!.price)} และเผยแพร่`
                      : "เผยแพร่ประกาศ"}
                </Button>
              </>
            ) : (
              <Button size="lg" onClick={goNext} className={cn("min-w-[120px] font-semibold")}>
                ถัดไป
                {showAll && errorCount > 0 && <span className="sm:hidden"> ({errorCount})</span>}
              </Button>
            )}
          </div>
        </>
      }
    >
      <StepComponent
        values={values}
        stepHref={stepHref}
        uploadPhoto={(body) => api.uploadPhoto(draft.id, body)}
        set={set}
        errors={visible}
        touch={touch}
      />
      {publishError && (
        <FormAlert>
          <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
          <span>{publishError}</span>
        </FormAlert>
      )}
    </WizardFrame>
  );
}

/** The first chosen station with its walking distance, for the preview card. */
export function usePreviewStation(values: DraftValues) {
  const { data: nearby } = useQuery({
    ...nearbyStationsQuery(values.point ?? { lat: 0, lng: 0 }),
    enabled: Boolean(values.point && values.stations.length),
  });
  return nearby?.data.find((s) => s.station.code === values.stations[0]);
}

export function TipCard({ step }: { step: PostStep }) {
  return (
    <div className="rounded-lg border border-line bg-white p-4 text-sm">
      <p className="font-semibold text-ink">{tips[step].title}</p>
      <p className="mt-1 text-slate">{tips[step].body}</p>
    </div>
  );
}

interface WizardFrameProps {
  /** Shown next to the logo: "ลงประกาศ", or "แก้ไขประกาศ PH-1008" in edit mode. */
  label: ReactNode;
  step: PostStep;
  /** Heading and line above the step; defaults to the new-listing copy. */
  intro?: { title: string; body: string };
  /** Phones: the header arrow goes to the previous step. */
  backHref?: string;
  /** Centre of the header: save state or unsaved changes. */
  status: ReactNode;
  /** Right of the header: leave the wizard. */
  exit: ReactNode;
  /** Desktop stepper (phones get "ขั้นที่ X จาก 5"). */
  stepper: ReactNode;
  /** Above the step on every screen size, e.g. why a listing was rejected. */
  banner?: ReactNode;
  preview: ReactNode;
  /** Card under the preview: a tip, an error summary or the amount to pay. */
  note: ReactNode;
  /** Content of the fixed bottom bar. */
  footer: ReactNode;
  children: ReactNode;
}

/** The posting wizard's frame (C1–C7), shared by new drafts and edit mode (FE-24). */
export function WizardFrame({
  label,
  step,
  intro: introOverride,
  backHref,
  status,
  exit,
  stepper,
  banner,
  preview,
  note,
  footer,
  children,
}: WizardFrameProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-mist">
      <SkipLink />
      <header className="sticky top-0 z-30 border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-[1180px] items-center gap-3 px-2 sm:h-16 sm:gap-4 sm:px-8">
          {backHref ? (
            <Link
              href={backHref}
              aria-label="ย้อนกลับ"
              className="inline-flex size-11 items-center justify-center rounded-md text-ink hover:bg-mist sm:hidden"
            >
              <ChevronLeft className="size-6" aria-hidden="true" />
            </Link>
          ) : (
            <span className="size-11 sm:hidden" aria-hidden="true" />
          )}
          <span className="hidden sm:contents">
            <Logo />
            <span aria-hidden="true" className="h-6 w-px bg-line" />
            <span className="font-semibold text-ink">{label}</span>
          </span>
          <span className="flex-1 text-center sm:ml-auto sm:flex-none">{status}</span>
          {exit}
        </div>
        <div className="border-t border-line">
          <div className="mx-auto max-w-[1180px] px-4 py-4 sm:px-8">
            {/* Padding (offset by a negative margin) so the scroll box does not clip the current step's halo ring. */}
            <div className="-m-1.5 hidden overflow-x-auto p-1.5 md:block">{stepper}</div>
            <div className="md:hidden">
              <MobileStepper current={step} />
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-[1180px] flex-1 gap-8 px-4 pt-6 pb-32 sm:px-8 sm:pt-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <main id="main" className="flex min-w-0 flex-col gap-5">
          {banner}
          <div className="hidden md:block">
            <h1 className="text-[26px] font-semibold tracking-[-0.015em] text-ink sm:text-[30px]">
              {(introOverride ?? intro[step]).title}
            </h1>
            <p className="mt-1 text-[15px] text-slate">{(introOverride ?? intro[step]).body}</p>
          </div>
          {children}
        </main>

        <aside aria-label="ตัวอย่างประกาศ" className="hidden lg:block">
          <div className="sticky top-[180px] flex flex-col gap-4">
            <p className="text-sm font-medium text-slate">ตัวอย่างการ์ดในผลค้นหา</p>
            {preview}
            {note}
          </div>
        </aside>
      </div>

      <footer className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-white pb-[env(safe-area-inset-bottom)]">
        <div className="mx-auto flex max-w-[1180px] items-center gap-3 px-4 py-3 sm:px-8">{footer}</div>
      </footer>
    </div>
  );
}

export function WizardSkeleton() {
  return (
    <div className="min-h-dvh bg-mist" role="status" aria-label="กำลังโหลดแบบร่าง">
      <div className="h-[140px] border-b border-line bg-white" />
      <div className="mx-auto grid max-w-[1180px] gap-8 px-4 pt-8 sm:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-5">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-48 w-full rounded-[10px]" />
          <Skeleton className="h-48 w-full rounded-[10px]" />
        </div>
        <Skeleton className="hidden h-80 rounded-lg lg:block" />
      </div>
    </div>
  );
}

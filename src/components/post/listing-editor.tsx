"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { CircleAlert, CircleCheck, FileQuestion, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Callout } from "@/components/ui/callout";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { FormAlert } from "@/components/ui/field";
import { QueryError } from "@/components/ui/query-state";
import { toast } from "@/components/ui/toast";
import { routes } from "@/data/navigation";
import { ApiError } from "@/lib/api/client";
import { api } from "@/lib/api/endpoints";
import { queryKeys, sellerQueries } from "@/lib/api/queries";
import { changedFields, isPostStep, nextStep, postSteps, previousStep, stepErrors } from "@/lib/post-wizard";
import { canEdit } from "@/lib/seller";
import { useSession } from "@/providers/session";
import type { DraftValues, PostStep, SellerListingDto } from "@/types/api";
import { ListingPreviewCard } from "./preview-card";
import { DetailsStep } from "./steps/details-step";
import { LocationStep } from "./steps/location-step";
import { PhotosStep } from "./steps/photos-step";
import { PublishStep } from "./steps/publish-step";
import type { StepProps } from "./steps/shared";
import { TypeStep } from "./steps/type-step";
import { Stepper } from "./stepper";
import { PostShellMessage, SignInToPost, TipCard, usePreviewStation, WizardFrame, WizardSkeleton } from "./post-wizard";

const stepComponents: Record<PostStep, (props: StepProps) => ReactNode> = {
  type: TypeStep,
  location: LocationStep,
  details: DetailsStep,
  photos: PhotosStep,
  publish: PublishStep,
};

const allSteps = postSteps.map((s) => s.id);

/** Step headings in edit mode: what each step changes, not the first-time posting copy. */
const editIntro: Record<PostStep, { title: string; body: string }> = {
  type: { title: "ประเภททรัพย์", body: "ผู้ลงประกาศ ประกาศเพื่อขายหรือให้เช่า และประเภททรัพย์" },
  location: { title: "ทำเล", body: "ที่อยู่ หมุดบนแผนที่ และสถานีที่แสดงบนประกาศ" },
  details: { title: "รายละเอียดทรัพย์", body: "ขนาด ห้อง การตกแต่ง หัวข้อ และรายละเอียดประกาศ" },
  photos: { title: "รูปภาพ", body: "เพิ่ม ลบ หรือเรียงรูปใหม่ รูปแรกที่ผ่านคือรูปปก" },
  publish: { title: "ราคา", body: "ราคาและเงื่อนไข แล้วตรวจข้อมูลทั้งหมดอีกครั้งก่อนบันทึก" },
};
const listingsHref = routes.dashboardListings;

const lockedBody: Partial<Record<SellerListingDto["status"], string>> = {
  pending_review: "ประกาศนี้กำลังรอทีมงานตรวจ แก้ไขได้อีกครั้งเมื่อผลตรวจออก",
  closed: "ประกาศที่ปิดแล้วแก้ไขไม่ได้ ลงประกาศใหม่ได้จากหน้าลงประกาศ",
  draft: "แบบร่างแก้ไขต่อได้จากหน้าลงประกาศ",
};

/**
 * Edit mode of the posting wizard (FE-24) for a published, rejected or expired listing, at
 * `/dashboard/listings/:id/edit/:step`. Rendered by the route's layout, so the working copy
 * survives moving between steps; nothing is saved until "บันทึกการแก้ไข" (or "ส่งตรวจอีกครั้ง").
 */
export function ListingEditor() {
  const { id, step } = useParams<{ id: string; step: string }>();
  const { user, isPending: sessionPending } = useSession();
  const { data, isPending, isError, error, refetch, isFetching } = useQuery({
    ...sellerQueries.listingEdit(id),
    enabled: Boolean(user),
  });

  if (sessionPending) return <WizardSkeleton />;
  if (!user) return <SignInToPost next={routes.editListing(id, isPostStep(step) ? step : undefined)} />;
  if (isPending) return <WizardSkeleton />;
  if (isError) {
    return (
      <PostShellMessage>
        {error instanceof ApiError && error.status === 404 ? (
          <EmptyState
            icon={FileQuestion}
            title="ไม่พบประกาศนี้"
            body="ประกาศอาจถูกลบไปแล้ว หรือเป็นของบัญชีอื่น"
            action={
              <Button asChild size="lg">
                <Link href={listingsHref}>ไปที่ประกาศของฉัน</Link>
              </Button>
            }
            className="rounded-xl bg-white"
          />
        ) : (
          <QueryError what="ประกาศ" onRetry={() => refetch()} retrying={isFetching} />
        )}
      </PostShellMessage>
    );
  }
  if (!canEdit(data.listing)) {
    return (
      <PostShellMessage>
        <EmptyState
          icon={Lock}
          title="แก้ไขประกาศนี้ไม่ได้"
          body={lockedBody[data.listing.status]}
          action={
            <Button asChild size="lg">
              <Link href={listingsHref}>ไปที่ประกาศของฉัน</Link>
            </Button>
          }
          className="rounded-xl bg-white"
        />
      </PostShellMessage>
    );
  }
  if (!isPostStep(step)) {
    return (
      <PostShellMessage>
        <EmptyState
          icon={FileQuestion}
          title="ไม่พบขั้นตอนนี้"
          body="ลิงก์อาจพิมพ์ผิด กลับไปแก้ไขจากขั้นแรก"
          action={
            <Button asChild>
              <Link href={routes.editListing(id)}>กลับไปขั้นแรก</Link>
            </Button>
          }
          className="rounded-xl bg-white"
        />
      </PostShellMessage>
    );
  }
  return <Editor key={id} listing={data.listing} original={data.values} step={step} />;
}

function Editor({ listing, original, step }: { listing: SellerListingDto; original: DraftValues; step: PostStep }) {
  const router = useRouter();
  const client = useQueryClient();
  const [values, setValues] = useState(original);
  // Touched fields belong to the step they were touched on; a new step starts clean.
  const [touched, setTouched] = useState<{ step: PostStep; fields: Set<string> }>({ step, fields: new Set() });
  // After a save attempt every step shows all its errors.
  const [attempted, setAttempted] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [saveError, setSaveError] = useState<string>();
  const [savedExpired, setSavedExpired] = useState(false);

  const rejected = listing.status === "rejected";
  const stepHref = useCallback((s: PostStep) => routes.editListing(listing.id, s), [listing.id]);
  const set: StepProps["set"] = useCallback(
    (patch) => setValues((v) => ({ ...v, ...(typeof patch === "function" ? patch(v) : patch) })),
    [],
  );
  const touch = (field: string) =>
    setTouched((t) =>
      t.step === step
        ? t.fields.has(field)
          ? t
          : { step, fields: new Set(t.fields).add(field) }
        : { step, fields: new Set([field]) },
    );

  const errorsByStep = useMemo(
    () =>
      Object.fromEntries(allSteps.map((s) => [s, stepErrors(s, values)])) as Record<
        PostStep,
        ReturnType<typeof stepErrors>
      >,
    [values],
  );
  const invalidSteps = allSteps.filter((s) => Object.keys(errorsByStep[s]).length > 0);
  const errors = errorsByStep[step];
  const fieldsTouched = touched.step === step ? touched.fields : new Set<string>();
  const visible = attempted ? errors : Object.fromEntries(Object.entries(errors).filter(([k]) => fieldsTouched.has(k)));
  const changes = useMemo(() => changedFields(original, values).length, [original, values]);
  const firstStation = usePreviewStation(values);

  // Unsaved edits: the browser asks before closing the tab or reloading.
  useEffect(() => {
    if (!changes || savedExpired) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [changes, savedExpired]);

  const save = useMutation({
    mutationFn: () =>
      rejected ? api.resubmitSellerListing(listing.id, { values }) : api.updateSellerListing(listing.id, { values }),
    onSuccess: ({ data }) => {
      client.setQueryData(queryKeys.seller.listingEdit(listing.id), data);
      void client.invalidateQueries({ queryKey: queryKeys.seller.all });
      if (listing.status === "expired") {
        setSavedExpired(true);
        return;
      }
      toast(
        rejected
          ? "ส่งตรวจอีกครั้งแล้ว ทีมงานตรวจภายใน 2 ชม. ในเวลาทำการ"
          : "บันทึกการแก้ไขแล้ว ประกาศแสดงข้อมูลใหม่แล้ว",
      );
      router.push(rejected ? `${listingsHref}?status=pending_review` : listingsHref);
    },
    onError: (err) => {
      setSaveError(
        err instanceof ApiError && err.status === 422
          ? "ข้อมูลบางขั้นยังไม่ครบ ตรวจขั้นที่แจ้งไว้อีกครั้ง"
          : err instanceof ApiError && err.status === 409
            ? "ประกาศนี้เปลี่ยนสถานะแล้ว แก้ไขต่อไม่ได้ กลับไปที่ประกาศของฉันเพื่อดูสถานะล่าสุด"
            : "บันทึกไม่สำเร็จ ลองอีกครั้ง การแก้ไขยังอยู่ในหน้านี้",
      );
    },
  });

  const submit = () => {
    setSaveError(undefined);
    if (invalidSteps.length) {
      setAttempted(true);
      if (invalidSteps.includes(step)) {
        document
          .getElementById(`field-${Object.keys(errors)[0]}`)
          ?.scrollIntoView({ block: "start", behavior: "smooth" });
      } else {
        router.push(stepHref(invalidSteps[0]));
      }
      return;
    }
    save.mutate();
  };

  const leave = () => (changes ? setLeaving(true) : router.push(listingsHref));

  if (savedExpired) return <SavedExpired listing={listing} />;

  const StepComponent = stepComponents[step];
  const back = previousStep(step);
  const next = nextStep(step);
  const label = `แก้ไขประกาศ ${listing.code ?? ""}`.trim();
  const saveLabel = rejected ? "ส่งตรวจอีกครั้ง" : "บันทึกการแก้ไข";

  return (
    <>
      <WizardFrame
        label={label}
        step={step}
        intro={editIntro[step]}
        backHref={back && stepHref(back)}
        status={
          <span role="status" className="text-[13px] text-slate">
            {changes ? `มีการแก้ไข ${changes} จุดที่ยังไม่บันทึก` : "ยังไม่มีการแก้ไข"}
          </span>
        }
        exit={
          <button
            type="button"
            onClick={leave}
            className="inline-flex h-11 items-center px-2 text-sm font-medium text-brand-strong underline-offset-4 hover:underline"
          >
            ยกเลิก
          </button>
        }
        stepper={
          <Stepper
            hrefFor={stepHref}
            current={step}
            completed={allSteps.filter((s) => !invalidSteps.includes(s))}
            reachable={allSteps}
          />
        }
        banner={
          <>
            {/* Phones show the step name in the header; the page needs to say which listing this is. */}
            <p className="text-sm font-medium text-slate">
              {label}
              <span className="text-ink"> · {listing.title}</span>
            </p>
            {rejected && (
              <Callout tone="danger" title="ประกาศนี้ไม่ผ่านการตรวจ">
                {listing.rejectReason && <>เหตุผล: {listing.rejectReason} </>}
                แก้ไขตามที่แจ้ง แล้วกด “ส่งตรวจอีกครั้ง”
              </Callout>
            )}
            {listing.status === "expired" && (
              <Callout tone="warning" title="ประกาศนี้หมดอายุแล้ว">
                บันทึกการแก้ไขได้ตามปกติ แล้วต่ออายุเพื่อให้กลับมาแสดงในผลค้นหา
              </Callout>
            )}
            {attempted && invalidSteps.length > 0 && (
              <FormAlert>
                <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
                <span>
                  ยังมี {invalidSteps.length} ขั้นที่ต้องแก้ก่อนบันทึก:{" "}
                  {invalidSteps.map((s, i) => (
                    <span key={s}>
                      {i > 0 && ", "}
                      <Link href={stepHref(s)} className="font-medium underline underline-offset-4">
                        {postSteps.find((p) => p.id === s)!.label}
                      </Link>
                    </span>
                  ))}
                </span>
              </FormAlert>
            )}
          </>
        }
        preview={<ListingPreviewCard values={values} station={firstStation} />}
        note={
          step === "publish" ? (
            <div className="rounded-lg border border-line bg-white p-4 text-sm">
              <p className="font-semibold text-ink">{rejected ? "ส่งตรวจอีกครั้ง" : "บันทึกแล้วแสดงทันที"}</p>
              <p className="mt-1 text-slate">
                {rejected
                  ? "ทีมงานตรวจภายใน 2 ชม. ในเวลาทำการ ถ้าต้องแก้อีก เราจะบอกว่าแก้ตรงไหน"
                  : "การแก้ไขแสดงบนประกาศทันทีที่บันทึก วันหมดอายุไม่เปลี่ยน ดันประกาศได้จากหน้าประกาศของฉัน"}
              </p>
            </div>
          ) : (
            <TipCard step={step} />
          )
        }
        footer={
          <>
            {back && (
              <Button asChild variant="outline" size="lg" className="max-sm:hidden">
                <Link href={stepHref(back)}>ย้อนกลับ</Link>
              </Button>
            )}
            {next && (
              <Button asChild variant="outline" size="lg">
                <Link href={stepHref(next)}>ถัดไป</Link>
              </Button>
            )}
            <Button size="lg" onClick={submit} disabled={save.isPending} className="ml-auto font-semibold">
              {save.isPending ? "กำลังบันทึก..." : saveLabel}
            </Button>
          </>
        }
      >
        <StepComponent
          values={values}
          stepHref={stepHref}
          uploadPhoto={(body) => api.uploadListingPhoto(listing.id, body)}
          set={set}
          errors={visible}
          touch={touch}
          editing
        />
        {saveError && (
          <FormAlert>
            <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
            <span>{saveError}</span>
          </FormAlert>
        )}
      </WizardFrame>

      <Dialog open={leaving} onOpenChange={setLeaving}>
        <DialogContent className="sm:w-[min(440px,calc(100vw-48px))]">
          <div className="p-6 pr-14">
            <DialogTitle className="text-xl font-semibold text-ink">ทิ้งการแก้ไข?</DialogTitle>
            <DialogDescription className="mt-2 text-[15px] text-slate">
              มีการแก้ไข {changes} จุดที่ยังไม่บันทึก ถ้าออกตอนนี้ ประกาศจะเหมือนเดิม
            </DialogDescription>
          </div>
          <div className="flex justify-end gap-2 border-t border-line px-6 py-4">
            <Button variant="outline" size="base" onClick={() => setLeaving(false)}>
              แก้ไขต่อ
            </Button>
            <Button variant="danger-solid" size="base" onClick={() => router.push(listingsHref)}>
              ทิ้งการแก้ไข
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/** Expired listing saved: it stays expired until the lister renews it (FE-24). */
function SavedExpired({ listing }: { listing: SellerListingDto }) {
  const router = useRouter();
  const client = useQueryClient();
  const renew = useMutation({
    mutationFn: () => api.bulkUpdateListings({ ids: [listing.id], action: "renew" }),
    onSuccess: () => {
      void client.invalidateQueries({ queryKey: queryKeys.seller.all });
      toast("ต่ออายุแล้ว ประกาศกลับมาแสดงในผลค้นหา 60 วัน");
      router.push(`${listingsHref}?status=published`);
    },
  });
  return (
    <PostShellMessage>
      <EmptyState
        icon={CircleCheck}
        title="บันทึกการแก้ไขแล้ว"
        body="ประกาศยังหมดอายุอยู่ ต่ออายุเพื่อให้กลับมาแสดงในผลค้นหาอีก 60 วัน"
        action={
          <Button size="lg" onClick={() => renew.mutate()} disabled={renew.isPending}>
            {renew.isPending ? "กำลังต่ออายุ..." : "ต่ออายุ 60 วัน"}
          </Button>
        }
        secondary={
          <Link href={listingsHref} className="font-medium text-brand-strong underline-offset-4 hover:underline">
            กลับไปประกาศของฉัน
          </Link>
        }
        className="rounded-xl bg-white"
      />
      {renew.isError && (
        <FormAlert className="mt-4">
          <CircleAlert className="mt-0.5 size-[18px] shrink-0" aria-hidden="true" />
          <span>ต่ออายุไม่สำเร็จ ลองอีกครั้ง หรือต่ออายุจากหน้าประกาศของฉัน</span>
        </FormAlert>
      )}
    </PostShellMessage>
  );
}

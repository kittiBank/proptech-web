"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { FilePen, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { FormAlert } from "@/components/ui/field";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { propertyTypeLabels } from "@/data/catalog";
import { routes } from "@/data/navigation";
import { api } from "@/lib/api/endpoints";
import { draftQueries } from "@/lib/api/queries";
import { formatThaiDate } from "@/lib/listing";
import { postSteps, reachableSteps } from "@/lib/post-wizard";
import { useSession } from "@/providers/session";
import type { DraftDto } from "@/types/api";
import { PostShellMessage, SignInToPost } from "./post-wizard";

/** Where to reopen a draft: the first step not yet completed. */
const resumeStep = (d: DraftDto) => reachableSteps(d.completedSteps).at(-1)!;

/**
 * `/post`: resumes an unfinished draft or creates a new one. With no drafts
 * it goes straight into step 1.
 */
export function PostStart() {
  const router = useRouter();
  const { user, isPending: sessionPending } = useSession();
  const drafts = useQuery({ ...draftQueries.list, enabled: Boolean(user) });
  const create = useMutation({
    mutationFn: api.createDraft,
    onSuccess: ({ data }) => router.replace(routes.postStep(data.id, "type")),
  });
  const started = useRef(false);
  const list = drafts.data?.data;

  useEffect(() => {
    if (list && list.length === 0 && !started.current) {
      started.current = true;
      create.mutate();
    }
  }, [list, create]);

  if (sessionPending) return <StartSkeleton />;
  if (!user) return <SignInToPost next={routes.postProperty} />;
  if (drafts.isError) {
    return (
      <PostShellMessage>
        <QueryError what="แบบร่าง" onRetry={() => drafts.refetch()} retrying={drafts.isFetching} />
      </PostShellMessage>
    );
  }
  if (!list || list.length === 0) {
    return create.isError ? (
      <PostShellMessage>
        <FormAlert>เริ่มประกาศใหม่ไม่สำเร็จ ลองอีกครั้ง</FormAlert>
        <Button className="mt-4" onClick={() => create.mutate()}>
          ลองอีกครั้ง
        </Button>
      </PostShellMessage>
    ) : (
      <StartSkeleton />
    );
  }

  return (
    <PostShellMessage>
      <h1 className="text-[26px] font-semibold tracking-[-0.015em] text-ink">ทำต่อจากแบบร่าง</h1>
      <p className="mt-1 text-[15px] text-slate">คุณมีประกาศที่ยังทำไม่เสร็จ เลือกทำต่อ หรือเริ่มประกาศใหม่</p>
      <ul className="mt-6 flex flex-col gap-3">
        {list.map((d) => {
          const step = resumeStep(d);
          const label = postSteps.find((s) => s.id === step)?.label;
          const title =
            d.values.title ||
            [d.values.propertyType && propertyTypeLabels[d.values.propertyType], d.values.projectName]
              .filter(Boolean)
              .join(" ") ||
            "ประกาศใหม่ (ยังไม่มีหัวข้อ)";
          return (
            <li key={d.id} className="flex items-center gap-4 rounded-lg border border-line bg-white p-4">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-md bg-brand-soft text-brand">
                <FilePen className="size-5" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-1 font-semibold text-ink">{title}</span>
                <span className="block text-sm text-slate">
                  แก้ไขล่าสุด {formatThaiDate(d.updatedAt)} ทำถึงขั้น {label}
                </span>
              </span>
              <Button onClick={() => router.push(routes.postStep(d.id, step))} aria-label={`ทำต่อ ${title}`}>
                ทำต่อ
              </Button>
            </li>
          );
        })}
      </ul>
      <Button
        variant="outline"
        size="lg"
        className="mt-5 w-full"
        onClick={() => create.mutate()}
        disabled={create.isPending}
      >
        <Plus aria-hidden="true" />
        เริ่มประกาศใหม่
      </Button>
    </PostShellMessage>
  );
}

function StartSkeleton() {
  return (
    <PostShellMessage>
      <div role="status" aria-label="กำลังเตรียมแบบร่าง" className="flex flex-col gap-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-20 w-full rounded-lg" />
      </div>
    </PostShellMessage>
  );
}

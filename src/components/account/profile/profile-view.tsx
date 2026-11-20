"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { routes } from "@/data/navigation";
import { profileQuery } from "@/lib/api/queries";
import { profileCompleteness } from "@/lib/profile";
import type { ProfileDto } from "@/types/api";
import { ProgressBar } from "../progress-bar";
import { NotificationSettings } from "./notification-settings";
import { PersonalInfo } from "./personal-info";
import { PrivacySection } from "./privacy-section";
import { SecuritySection } from "./security-section";

function Completeness({ profile }: { profile: ProfileDto }) {
  const { percent, next } = profileCompleteness(profile);
  if (!next) return null;
  return (
    <div className="flex flex-wrap items-center gap-4 rounded-[10px] border border-line bg-white px-5 py-4">
      <div className="min-w-[220px] flex-1">
        <p className="font-semibold text-ink">โปรไฟล์ครบ {percent}%</p>
        <p className="mt-0.5 mb-2 text-sm text-slate">{next.label}</p>
        <ProgressBar value={percent} label="ความครบถ้วนของโปรไฟล์" />
      </div>
      <Button asChild variant="ink">
        <Link href={`${routes.profile}#personal`}>{next.cta}</Link>
      </Button>
    </div>
  );
}

/** `/account/profile` (B7): personal info, security, notification settings and privacy. */
export function ProfileView() {
  const { data: profile, isPending, isError, isFetching, refetch } = useQuery(profileQuery);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-[-0.015em] text-ink sm:text-[30px]">โปรไฟล์และการตั้งค่า</h1>
        <p className="mt-1 text-slate">
          ข้อมูลนี้ใช้เมื่อคุณติดต่อผู้ลงประกาศ ผู้ลงประกาศเห็นแค่ชื่อและเบอร์ที่คุณส่งให้
        </p>
      </div>
      {isPending ? (
        <div role="status" aria-label="กำลังโหลดโปรไฟล์" className="flex flex-col gap-5">
          <Skeleton className="h-24 w-full rounded-[10px]" />
          <Skeleton className="h-96 w-full rounded-[10px]" />
        </div>
      ) : isError ? (
        <QueryError what="โปรไฟล์" onRetry={() => refetch()} retrying={isFetching} />
      ) : (
        <>
          <Completeness profile={profile} />
          <PersonalInfo profile={profile} />
          <SecuritySection profile={profile} />
          <NotificationSettings profile={profile} />
          <PrivacySection profile={profile} />
        </>
      )}
    </div>
  );
}

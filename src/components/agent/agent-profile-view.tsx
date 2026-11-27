"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Check, Flag, MessageCircle, Phone, UserRoundX } from "lucide-react";
import { Container } from "@/components/home/section-header";
import { LineMark } from "@/components/listing/line-mark";
import { ShareMenu } from "@/components/listing/share-menu";
import { lineColor } from "@/components/property/transit-badge";
import { Avatar } from "@/components/ui/avatar";
import { BottomActionBar } from "@/components/ui/bottom-action-bar";
import { Button } from "@/components/ui/button";
import { QueryError, Skeleton } from "@/components/ui/query-state";
import { routes } from "@/data/navigation";
import { agentShortName } from "@/lib/agent-params";
import { ApiError } from "@/lib/api/client";
import { agentQueries } from "@/lib/api/queries";
import { useAuthGate, useResumeAction } from "@/lib/auth-gate";
import { lineHref, maskPhone, telHref } from "@/lib/contact";
import { formatNumber } from "@/lib/format";
import { toBuddhistYear } from "@/lib/listing";
import { cn } from "@/lib/utils";
import type { AgentProfileDto } from "@/types/api";
import { AgentListings } from "./agent-listings";

const formatReply = (minutes: number) => (minutes < 60 ? `${minutes} นาที` : `${Math.round(minutes / 60)} ชม.`);

/** Starts (or resumes after sign-in) a chat with the agent. */
function useMessageAgent(agent: AgentProfileDto) {
  const router = useRouter();
  const requireAuth = useAuthGate();
  const key = `agent:${agent.slug}`;
  const open = () => router.push(routes.messageTo(key));
  useResumeAction("message", key, open);
  return () =>
    requireAuth({ intent: "message", key, preview: { title: agent.name, subtitle: agent.company ?? "นายหน้า" } }, open);
}

function ContactCard({ agent, onMessage }: { agent: AgentProfileDto; onMessage: () => void }) {
  const [showPhone, setShowPhone] = useState(false);
  return (
    <section
      aria-labelledby="agent-contact"
      className="flex flex-col gap-2.5 rounded-lg border border-line bg-white p-[22px]"
    >
      <h2 id="agent-contact" className="mb-1 text-[17px] font-semibold text-ink">
        ติดต่อ{agentShortName(agent)}
      </h2>
      {showPhone ? (
        <Button asChild size="lg">
          <a href={telHref(agent.phone)}>
            <Phone aria-hidden="true" />
            โทร {agent.phone}
          </a>
        </Button>
      ) : (
        <Button size="lg" onClick={() => setShowPhone(true)}>
          <Phone aria-hidden="true" />
          แสดงเบอร์โทร {maskPhone(agent.phone)}
        </Button>
      )}
      {agent.lineId && (
        <Button asChild size="lg" variant="outline">
          <a href={lineHref(agent.lineId)} target="_blank" rel="noopener noreferrer">
            <LineMark />
            แชทผ่าน LINE
          </a>
        </Button>
      )}
      <Button size="lg" variant="outline" onClick={onMessage}>
        <MessageCircle aria-hidden="true" />
        ส่งข้อความ
      </Button>
      <p className="mt-0.5 text-[13px] text-slate">ทำงาน {agent.workingHours}</p>
    </section>
  );
}

function Stats({ agent }: { agent: AgentProfileDto }) {
  const items = [
    { label: "ประกาศที่เปิดอยู่", short: "ประกาศ", value: formatNumber(agent.counts.all) },
    { label: "ตอบกลับโดยเฉลี่ย", short: "ตอบกลับ", value: formatReply(agent.responseMinutes) },
    { label: "ประสบการณ์", short: "ประสบการณ์", value: `${agent.yearsExperience} ปี` },
    { label: "ภาษาที่ใช้", short: "ภาษา", value: agent.languages.join(", "), wide: true },
  ];
  return (
    <dl className="mt-4 grid grid-cols-3 rounded-lg border border-line bg-white py-3 text-center sm:mt-7 sm:flex sm:rounded-none sm:border-0 sm:bg-transparent sm:py-0 sm:text-left">
      {items.map((item, i) => (
        <div
          key={item.label}
          className={cn(
            "flex flex-col-reverse px-2 sm:px-6",
            i > 0 && "border-l border-line",
            i === 0 && "sm:pl-0",
            item.wide && "hidden sm:flex",
          )}
        >
          <dt className="text-xs text-slate sm:text-sm">
            <span className="sm:hidden">{item.short}</span>
            <span className="hidden sm:inline">{item.label}</span>
          </dt>
          <dd className="font-semibold text-ink sm:text-[22px]">{item.value}</dd>
        </div>
      ))}
    </dl>
  );
}

function Hero({ agent, onMessage }: { agent: AgentProfileDto; onMessage: () => void }) {
  const checks = [
    agent.idVerified && "ยืนยันตัวตนแล้ว",
    agent.phoneVerified && "ยืนยันเบอร์โทรแล้ว",
    `สมาชิกตั้งแต่ พ.ศ. ${toBuddhistYear(agent.memberSince)}`,
  ].filter((c): c is string => Boolean(c));

  return (
    <section className="border-b border-line bg-mist">
      <Container className="pt-5 pb-6 sm:py-9">
        <div className="flex justify-end sm:hidden">
          <ShareMenu title={agent.name} label="แชร์โปรไฟล์" />
        </div>
        <div className="grid items-start gap-12 lg:grid-cols-[minmax(0,1fr)_380px]">
          <div>
            <div className="flex flex-col items-center gap-3 text-center sm:flex-row sm:gap-[22px] sm:text-left">
              <Avatar name={agent.name} size="xl" />
              <div className="min-w-0">
                <p className="text-[13px] text-slate sm:text-sm">นายหน้า</p>
                <h1 className="text-2xl leading-tight font-semibold tracking-[-0.02em] text-ink sm:text-[34px]">
                  {agent.name}
                </h1>
                {agent.company && (
                  <p className="mt-0.5 text-sm sm:text-[15px]">
                    <span className="font-medium text-brand-strong">{agent.company}</span>
                    {agent.teamSize && <span className="text-slate"> · ทีม {agent.teamSize} คน</span>}
                  </p>
                )}
                <ul className="mt-2.5 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[13px] text-ink sm:justify-start sm:text-sm">
                  {checks.map((c) => (
                    <li key={c} className="inline-flex items-center gap-1.5">
                      <Check className="size-4 text-brand" strokeWidth={2.5} aria-hidden="true" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
              <ShareMenu
                title={agent.name}
                label="แชร์โปรไฟล์"
                className="hidden self-start sm:ml-auto sm:flex lg:hidden"
              />
            </div>
            <Stats agent={agent} />
          </div>
          <div className="hidden lg:block">
            <ContactCard agent={agent} onMessage={onMessage} />
          </div>
        </div>
      </Container>
    </section>
  );
}

function About({ agent }: { agent: AgentProfileDto }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] lg:gap-12">
      <section aria-labelledby="agent-about">
        <h2 id="agent-about" className="mb-2 text-[17px] font-semibold text-ink sm:mb-3 sm:text-[21px]">
          เกี่ยวกับ
        </h2>
        <p
          id="agent-about-text"
          className={cn(
            "max-w-[64ch] text-sm leading-[1.75] text-ink sm:text-[15px] sm:leading-[1.8]",
            !expanded && "line-clamp-3 sm:line-clamp-none",
          )}
        >
          {agent.about}
        </p>
        {!expanded && (
          <button
            type="button"
            aria-expanded={false}
            aria-controls="agent-about-text"
            onClick={() => setExpanded(true)}
            className="mt-1 min-h-11 text-sm font-medium text-brand-strong underline-offset-4 hover:underline sm:hidden"
          >
            อ่านต่อ
          </button>
        )}
      </section>
      {agent.areas.length > 0 && (
        <section aria-labelledby="agent-areas">
          <h2 id="agent-areas" className="mb-2.5 text-[17px] font-semibold text-ink sm:mb-3 sm:text-[21px]">
            ย่านที่ดูแล
          </h2>
          <ul className="flex flex-wrap gap-2">
            {agent.areas.map(({ station, listingCount }) => (
              <li
                key={station.code}
                className="inline-flex h-9 items-center gap-2 rounded-full border border-line-strong bg-white pr-3 pl-1.5 text-sm text-ink"
              >
                <span
                  className={cn(
                    "inline-flex h-5 min-w-8 items-center justify-center rounded-sm px-1 text-[11px] font-semibold text-white tabular-nums",
                    lineColor[station.line],
                  )}
                >
                  {station.code}
                </span>
                {station.name}
                <span className="text-[13px] text-slate tabular-nums">
                  {listingCount}
                  <span className="sr-only"> ประกาศ</span>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}

function NotFoundPanel() {
  return (
    <Container className="flex min-h-[60vh] flex-col items-start justify-center gap-5 py-20">
      <UserRoundX className="size-10 text-brand" aria-hidden="true" />
      <div>
        <h1 className="text-[28px] font-semibold text-ink">ไม่พบโปรไฟล์นายหน้านี้</h1>
        <p className="mt-2 max-w-[52ch] text-[16px] text-slate">ลิงก์อาจไม่ถูกต้อง หรือนายหน้าปิดโปรไฟล์ไปแล้ว</p>
      </div>
      <Button asChild size="lg">
        <Link href={routes.search({ mode: "buy" })}>ค้นหาประกาศ</Link>
      </Button>
    </Container>
  );
}

/** `/agents/[slug]` (A7 desktop, A9 mobile): who the agent is, where they work, and their listings. */
export function AgentProfileView() {
  const { slug } = useParams<{ slug: string }>();
  const { data, isPending, isError, error, refetch, isFetching } = useQuery(agentQueries.detail(slug));
  const agent = data?.data;

  useEffect(() => {
    if (agent) document.title = `${agent.name} นายหน้า | PropertyHub`;
  }, [agent]);

  if (isPending) return <AgentProfileSkeleton />;
  if (isError && error instanceof ApiError && error.status === 404) return <NotFoundPanel />;
  if (isError || !agent) {
    return (
      <Container className="py-16">
        <QueryError what="โปรไฟล์นายหน้า" onRetry={() => refetch()} retrying={isFetching} />
      </Container>
    );
  }
  return <AgentProfile agent={agent} />;
}

function AgentProfile({ agent }: { agent: AgentProfileDto }) {
  const messageAgent = useMessageAgent(agent);
  return (
    <div className="pb-24 lg:pb-0">
      <Hero agent={agent} onMessage={messageAgent} />
      <Container className="pt-6 pb-12 sm:pt-9 sm:pb-[72px]">
        <About agent={agent} />
        <AgentListings agent={agent} />
        <p className="mt-10 text-[13px] text-slate">
          พบข้อมูลไม่ถูกต้อง {/* No profile report form yet: the safety topic explains how to reach the team. */}
          <Link
            href={routes.helpTopic("safety")}
            className="inline-flex items-center gap-1 text-brand-strong underline-offset-4 hover:underline"
          >
            <Flag className="size-3.5" aria-hidden="true" />
            รายงานโปรไฟล์นี้
          </Link>
        </p>
      </Container>

      <BottomActionBar label={`ติดต่อ${agentShortName(agent)}`} className="grid grid-cols-3 gap-2">
        <Button asChild size="lg" className="font-semibold">
          <a href={telHref(agent.phone)}>โทร</a>
        </Button>
        {agent.lineId ? (
          <Button asChild size="lg" variant="outline">
            <a href={lineHref(agent.lineId)} target="_blank" rel="noopener noreferrer">
              LINE
            </a>
          </Button>
        ) : (
          <span aria-hidden="true" />
        )}
        <Button size="lg" variant="outline" onClick={messageAgent}>
          ข้อความ
        </Button>
      </BottomActionBar>
    </div>
  );
}

export function AgentProfileSkeleton() {
  return (
    <div role="status" aria-label="กำลังโหลดโปรไฟล์นายหน้า">
      <div className="border-b border-line bg-mist">
        <Container className="flex flex-col items-center gap-4 py-9 sm:flex-row">
          <Skeleton className="size-[84px] rounded-full sm:size-[104px]" />
          <div className="flex flex-col items-center gap-2 sm:items-start">
            <Skeleton className="h-4 w-16" />
            <Skeleton className="h-8 w-56" />
            <Skeleton className="h-4 w-40" />
          </div>
        </Container>
      </div>
      <Container className="flex flex-col gap-3 py-9">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-4 w-full max-w-xl" />
        <Skeleton className="h-4 w-4/5 max-w-lg" />
      </Container>
    </div>
  );
}

import { Suspense } from "react";
import type { Metadata } from "next";
import { AgentProfileSkeleton, AgentProfileView } from "@/components/agent/agent-profile-view";
import { JsonLd } from "@/components/seo/json-ld";
import { routes } from "@/data/navigation";
import { getAgentForSeo } from "@/lib/api/server";
import { metaDescription } from "@/lib/site";
import { agentJsonLd, breadcrumbJsonLd } from "@/lib/structured-data";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const agent = await getAgentForSeo(slug);
  if (!agent) return { title: "ไม่พบโปรไฟล์นายหน้า", robots: { index: false } };
  const title = `${agent.name} นายหน้า${agent.company ? ` ${agent.company}` : ""}`;
  return {
    title,
    description: metaDescription(agent.about),
    alternates: { canonical: routes.agent(slug) },
    openGraph: { type: "profile", url: routes.agent(slug), title, description: metaDescription(agent.about) },
  };
}

/** JSON-LD for search engines, read at request time inside its own Suspense. */
async function StructuredData({ params }: Props) {
  const { slug } = await params;
  const agent = await getAgentForSeo(slug);
  if (!agent) return null;
  return (
    <JsonLd
      data={[
        agentJsonLd(agent),
        breadcrumbJsonLd([
          { name: "หน้าแรก", path: routes.home },
          { name: agent.name, path: routes.agent(agent.slug) },
        ]),
      ]}
    />
  );
}

/**
 * Agent profile (A7, A9). The view reads the slug with `useParams` and loads
 * `GET /agents/:slug` plus `GET /properties?agent=` through TanStack Query.
 */
export default function AgentPage({ params }: Props) {
  return (
    <>
      <Suspense fallback={<AgentProfileSkeleton />}>
        <AgentProfileView />
      </Suspense>
      <Suspense>
        <StructuredData params={params} />
      </Suspense>
    </>
  );
}

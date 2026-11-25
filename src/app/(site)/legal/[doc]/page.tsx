import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LegalView } from "@/components/legal/legal-view";
import { findLegalDoc, legalDocs } from "@/data/legal";
import { routes } from "@/data/navigation";

type Props = { params: Promise<{ doc: string }> };

/** The four documents are prerendered; anything else is a 404. */
export function generateStaticParams() {
  return legalDocs.map((d) => ({ doc: d.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = findLegalDoc((await params).doc);
  if (!doc) return { title: "ไม่พบเอกสาร", robots: { index: false } };
  return { title: doc.title, description: doc.description, alternates: { canonical: routes.legal(doc.slug) } };
}

/** Legal pages (D5): privacy, terms, listing rules and cookies. */
export default async function LegalPage({ params }: Props) {
  const doc = findLegalDoc((await params).doc);
  if (!doc) notFound();
  return <LegalView doc={doc} />;
}

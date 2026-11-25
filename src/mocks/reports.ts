import type { CreateReportRequest, ReportReason } from "@/types/api";

/**
 * Listing reports behind `POST /properties/:slug/reports` (D6). Kept in memory:
 * the admin queue (E4) reads them later. Reporters stay anonymous to the poster.
 */

interface StoredReport extends CreateReportRequest {
  id: string;
  slug: string;
  createdAt: string;
}

let reports: StoredReport[] = [];

export const reportReasons: ReportReason[] = ["scam", "inaccurate", "unavailable", "duplicate", "other"];

export function createReport(slug: string, body: CreateReportRequest): StoredReport {
  const report = {
    id: `r-${Date.now().toString(36)}${reports.length}`,
    slug,
    reason: body.reason,
    details: body.details?.trim() || undefined,
    createdAt: new Date().toISOString(),
  };
  reports.push(report);
  return report;
}

export const listReports = (slug?: string) => reports.filter((r) => !slug || r.slug === slug);

export function resetMockReports() {
  reports = [];
}

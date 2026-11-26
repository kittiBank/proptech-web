import type { Metadata } from "next";
import { ListingReview } from "@/components/admin/listing-review";

type Props = { params: Promise<{ listingId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { listingId } = await params;
  return { title: `ตรวจประกาศ ${decodeURIComponent(listingId)}` };
}

/** E3. The view reads the id with `useParams`. */
export default function ListingReviewPage() {
  return <ListingReview />;
}

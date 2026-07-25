import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "The DOCket - Verified Athlete Stats | IN the GAME with DOC",
  description: "DOC iT — Show Your Receipts. Verified athlete stats with video proof. Track height, weight, 40-yard dash, bench, squat, vertical jump & more. Get discovered by college coaches.",
  keywords: ["athlete stats", "recruiting", "verified stats", "high school sports", "college recruiting", "DOC iT", "show your receipts"],
  openGraph: {
    title: "The DOCket - Verified Athlete Stats",
    description: "DOC iT — Show Your Receipts. Verified athlete stats backed by video proof.",
    type: "website",
    siteName: "IN the GAME with DOC",
  },
};

export default function DocketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}

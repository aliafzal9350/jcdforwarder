import type { Metadata } from "next";
import { SITE_CONFIG } from "@/data/siteConfig";

// This route is a duplicate of /services/sea-freight-fcl-lcl (same component, re-exported).
// Canonical points at the primary URL so search engines consolidate on one page.
export const metadata: Metadata = {
  title: "Sea Freight (FCL & LCL) from China | JCD Forwarder Licensed NVOCC",
  alternates: { canonical: `${SITE_CONFIG.url}/services/sea-freight-fcl-lcl` },
};

export default function SeaFreightLayout({ children }: { children: React.ReactNode }) {
  return children;
}

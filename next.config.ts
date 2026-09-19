import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Old WordPress blog URLs (pre-migration) -> closest equivalent pages, so existing
  // Google rankings and backlinks aren't lost to 404s.
  async redirects() {
    return [
      { source: "/blog", destination: "/services", permanent: true },
      {
        source: "/air-freight-vs-sea-freight-choosing-the-best-option-for-your-business",
        destination: "/services/sea-freight-fcl-lcl",
        permanent: true,
      },
      {
        source: "/the-importance-of-reliable-customs-clearance-in-international-trade",
        destination: "/services/ddp-shipping",
        permanent: true,
      },
      {
        source: "/how-freight-forwarding-simplifies-global-shipping",
        destination: "/services",
        permanent: true,
      },
    ];
  },
};

export default nextConfig;

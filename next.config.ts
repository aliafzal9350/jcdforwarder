import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // 3D models are versioned via a ?v= query string in the code, so they can cache for a year.
  async headers() {
    return [
      {
        source: "/models/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },

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

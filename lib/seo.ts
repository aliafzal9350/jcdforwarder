import type { Metadata } from "next";
import { SITE_CONFIG } from "@/data/siteConfig";

interface BuildMetadataOptions {
  title: string;
  description: string;
  /** Path relative to the site root, e.g. "/contact" */
  path: string;
  /**
   * Set true when `title` already contains the site name, to stop the root layout's
   * `%s | ${SITE_CONFIG.shortName}` template from appending it a second time.
   */
  absoluteTitle?: boolean;
}

const OG_IMAGE = { url: `${SITE_CONFIG.url}/images/og-default.jpg`, width: 1200, height: 630, alt: SITE_CONFIG.shortName };

/**
 * Shared metadata shape (title/description/canonical/OG/Twitter) so pages stop duplicating this
 * by hand. Important: a page's own `openGraph`/`twitter` object REPLACES the root layout's
 * entirely rather than merging field-by-field, so every page must re-supply the OG image itself —
 * this helper does that automatically.
 */
export function buildMetadata({ title, description, path, absoluteTitle }: BuildMetadataOptions): Metadata {
  const url = `${SITE_CONFIG.url}${path}`;
  return {
    title: absoluteTitle ? { absolute: title } : title,
    description,
    alternates: { canonical: url },
    openGraph: {
      type: "website",
      url,
      siteName: SITE_CONFIG.name,
      title,
      description,
      images: [OG_IMAGE],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [OG_IMAGE.url],
    },
  };
}

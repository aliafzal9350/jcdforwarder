import type { MetadataRoute } from 'next';
import { SITE_CONFIG } from '@/data/siteConfig';

// Never disallow /_next/ or *.json: Googlebot needs the CSS/JS bundles and data files to render pages.
export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_CONFIG.url;

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/api/', '/admin/'],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

/**
 * JCD Forwarder Chatbot Facts
 * Single source of truth for the support assistant, derived from the site's own
 * data files so the chatbot can never drift from what the website publishes.
 */

import { TARGET_ROUTES, type CountryRoute } from '@/data/routes';
import { ORIGIN_HUBS } from '@/data/origins';
import { SITE_CONFIG } from '@/data/siteConfig';

export interface SiteLink {
  title: string;
  href: string;
  summary: string;
  keywords: string[];
}

// Mirrors LOGISTICS_TOOLS in app/tools/page.tsx — keep both lists in sync when a tool is added or removed.
export const ONLINE_TOOLS: SiteLink[] = [
  {
    title: 'Volumetric Weight Calculator',
    href: '/tools/volumetric-calculator',
    summary: 'actual vs. volumetric (chargeable) weight for air, express and LCL',
    keywords: ['volumetric', 'chargeable weight', 'dimensional weight', 'cbm calculator', 'weight calculator'],
  },
  {
    title: 'Cargo & Express Tracking',
    href: '/tools/tracking',
    summary: 'track DHL, FedEx, UPS parcels and JCD air waybills',
    keywords: ['tracking tool', 'track', 'waybill'],
  },
  {
    title: '3D Container Loading Planner',
    href: '/tools/container-loading-calculator',
    summary: 'how many cartons fit in a 20ft, 40ft, 40HQ or 45HQ container',
    keywords: ['container loading', 'container calculator', 'loading planner', 'how many cartons'],
  },
  {
    title: 'Flight Route & Transit Calculator',
    href: '/tools/flight-route-calculator',
    summary: 'flight distance, flight hours and Air DDP door-to-door schedule',
    keywords: ['flight route', 'flight time', 'air transit calculator'],
  },
  {
    title: 'Shipping Unit Converter',
    href: '/tools/shipping-unit-converter',
    summary: 'kg/lbs, cm/inches and CBM/CFT conversion, carton size to CBM',
    keywords: ['unit converter', 'convert', 'kg to lbs', 'cbm to cft'],
  },
  {
    title: 'China HS Code & Tariff Finder',
    href: '/tools/china-hs-code',
    summary: 'China export HS codes, duty rates and VAT rebates',
    keywords: ['hs code', 'tariff', 'tariff finder'],
  },
  {
    title: 'Proforma Invoice (PI) Generator',
    href: '/tools/proforma-invoice-generator',
    summary: 'create a printable proforma invoice PDF',
    keywords: ['proforma', 'invoice'],
  },
  {
    title: 'Packing List (PL) Generator',
    href: '/tools/packing-list-generator',
    summary: 'create a printable packing list with weights and CBM',
    keywords: ['packing list'],
  },
  {
    title: 'World Seaports Directory',
    href: '/tools/seaports',
    summary: '9,000+ ports with UN/LOCODE identifiers',
    keywords: ['seaport', 'seaports', 'port directory', 'locode'],
  },
  {
    title: 'Incoterms 2020 Decision Guide',
    href: '/tools/incoterms',
    summary: 'compare all 11 Incoterms (EXW, FOB, CIF, DDP…)',
    keywords: ['incoterms guide', 'incoterm guide', 'incoterms tool'],
  },
];

// Mirrors the service cards on app/services/page.tsx plus the Amazon FBA service page.
export const SERVICES: SiteLink[] = [
  { title: 'Air Freight', href: '/services/air-freight', summary: 'direct flights and pure battery channels', keywords: [] },
  { title: 'Sea Freight (FCL & LCL)', href: '/services/sea-freight-fcl-lcl', summary: 'full containers and consolidation', keywords: [] },
  { title: 'Rail Freight', href: '/services/rail-freight', summary: 'China-Europe rail express', keywords: [] },
  { title: 'DDP Shipping', href: '/services/ddp-shipping', summary: 'all-inclusive door-to-door, duties paid', keywords: [] },
  { title: 'Trucking Freight', href: '/services/trucking-freight', summary: 'inland cartage and cross-border linehaul', keywords: [] },
  { title: 'Express Courier', href: '/services/express-courier', summary: 'urgent samples and small parcels via DHL, FedEx, UPS', keywords: [] },
  { title: 'Amazon FBA Logistics', href: '/services/amazon-fba-logistics', summary: 'FNSKU labeling, palletizing and FBA delivery', keywords: [] },
];

const REGION_ORDER: CountryRoute['region'][] = [
  'North America',
  'Latin America & Caribbean',
  'Europe',
  'Middle East',
  'Asia Pacific',
  'South Asia',
];

const REGION_NAMES_ZH: Record<CountryRoute['region'], string> = {
  'North America': '北美',
  'Latin America & Caribbean': '拉丁美洲及加勒比',
  Europe: '欧洲',
  'Middle East': '中东',
  'Asia Pacific': '亚太',
  'South Asia': '南亚',
};

export const SERVED_COUNTRY_COUNT = TARGET_ROUTES.length;

export const SERVED_BY_REGION = REGION_ORDER.map((region) => ({
  region,
  routes: TARGET_ROUTES.filter((route) => route.region === region),
})).filter((group) => group.routes.length > 0);

export const WAREHOUSE_AREA = `${SITE_CONFIG.facility.warehouseAreaSqM.toLocaleString('en-US')} m²`;

export const ORIGIN_HUB_NAMES = ORIGIN_HUBS.map((hub) => hub.name);

const zhRegionNames = new Intl.DisplayNames(['zh'], { type: 'region', fallback: 'none' });

/** Full coverage list for the system prompt and knowledge base. */
export function formatServedCountries(): string {
  return SERVED_BY_REGION.map(
    ({ region, routes }) => `  - ${region}: ${routes.map((r) => r.name).join(', ')}`
  ).join('\n');
}

/** Short coverage list for chat replies (large regions are abbreviated). */
function formatServedSummary(zh: boolean): string {
  return SERVED_BY_REGION.map(({ region, routes }) => {
    const names = routes.map((r) => (zh ? zhRegionNames.of(r.code) ?? r.name : r.name));
    const label = zh ? REGION_NAMES_ZH[region] : region;
    if (names.length > 8) {
      const sample = names.slice(0, 6).join(zh ? '、' : ', ');
      return zh ? `• ${label}：${names.length} 个国家，包括${sample}等` : `• ${label}: ${names.length} countries incl. ${sample}`;
    }
    return zh ? `• ${label}：${names.join('、')}` : `• ${label}: ${names.join(', ')}`;
  }).join('\n');
}

/** Fixed reply for destinations JCD does not serve — never delegated to the model. */
export function buildUnservedReply(destinations: Array<{ code: string; name: string }>, zh: boolean): string {
  if (zh) {
    const names = destinations.map((d) => zhRegionNames.of(d.code) ?? d.name).join('、');
    return `抱歉，我们目前不提供到**${names}**的运输服务。\n\nJCD Forwarder 从中国发货到以下 ${SERVED_COUNTRY_COUNT} 个国家：\n${formatServedSummary(true)}\n\n如果您的货物要运往以上国家，请告诉我目的地，我来帮您安排报价。`;
  }
  const names = destinations.map((d) => d.name);
  const joined = names.length > 1 ? `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}` : names[0];
  return `Sorry, we don't currently ship to **${joined}**.\n\nJCD Forwarder ships from China to these ${SERVED_COUNTRY_COUNT} countries:\n${formatServedSummary(false)}\n\nIf your cargo is going to one of these, tell me the destination and I'll help you get a quote.`;
}

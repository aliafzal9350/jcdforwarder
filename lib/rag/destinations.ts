/**
 * JCD Forwarder Destination Resolver
 * Deterministically detects which countries a chat message mentions and whether
 * JCD serves them (TARGET_ROUTES), so destination answers never depend on the model.
 */

import { TARGET_ROUTES, type CountryRoute } from '@/data/routes';

export interface UnservedDestination {
  code: string;
  name: string;
}

export interface DestinationMatch {
  served: CountryRoute[];
  unserved: UnservedDestination[];
}

type TermKind = 'served' | 'unserved' | 'neutral';

interface Term {
  text: string;
  code: string;
  kind: TermKind;
  cjk: boolean;
  caseSensitive: boolean;
  weak: boolean;
  regex: RegExp | null;
}

// City names shared by several countries. They count only when no country is named alongside them,
// so "Hyderabad" resolves to India but "Hyderabad, Pakistan" resolves to Pakistan alone.
const WEAK_ALIASES = new Set(['hyderabad']);

// Common names, major cities and abbreviations for served countries.
const SERVED_ALIASES: Record<string, string[]> = {
  US: ['usa', 'u.s.a', 'u.s.', 'america', 'united states of america', 'new york', 'new jersey', 'los angeles', 'california', 'texas', 'florida', 'chicago', 'houston', 'miami', '美利坚'],
  CA: ['toronto', 'vancouver', 'montreal'],
  MX: ['mexico city', 'guadalajara', 'manzanillo'],
  GB: ['uk', 'u.k.', 'britain', 'great britain', 'england', 'scotland', 'wales', 'london', 'manchester', 'felixstowe', '英格兰'],
  DE: ['berlin', 'hamburg', 'frankfurt', 'munich'],
  FR: ['paris', 'le havre'],
  NL: ['holland', 'amsterdam', 'rotterdam'],
  BE: ['antwerp', 'brussels'],
  AT: ['vienna'],
  IE: ['dublin'],
  PL: ['warsaw'],
  CZ: ['czech', 'czech republic', 'prague'],
  ES: ['madrid', 'barcelona'],
  IT: ['milan', 'rome'],
  AE: ['uae', 'u.a.e', 'emirates', 'dubai', 'abu dhabi', 'sharjah', 'jebel ali', '阿联酋', '迪拜'],
  BH: ['manama'],
  AU: ['sydney', 'melbourne', 'brisbane', '澳洲'],
  JP: ['tokyo', 'osaka'],
  KR: ['korea', 'seoul', 'busan'],
  SG: [],
  MY: ['kuala lumpur', 'port klang', 'penang'],
  TH: ['bangkok'],
  PH: ['manila'],
  VN: ['viet nam', 'ho chi minh', 'saigon', 'hanoi', 'haiphong'],
  // Hyderabad also exists in Pakistan, but the Indian city is far more common; "Hyderabad, Pakistan"
  // still resolves as mixed (India served + Pakistan unserved) and the model is told both facts.
  IN: ['mumbai', 'delhi', 'new delhi', 'chennai', 'kolkata', 'bangalore', 'bengaluru', 'hyderabad', 'ahmedabad', 'pune', 'surat', 'jaipur', 'kochi', 'nhava sheva', 'mundra'],
  BD: ['dhaka', 'chittagong', 'chattogram', '孟加拉'],
  BS: ['the bahamas', 'nassau'],
};

// Uppercase-only abbreviations ("US" is a country, "us" is a pronoun).
const SERVED_UPPERCASE_CODES: Record<string, string[]> = {
  US: ['US'],
  GB: ['UK', 'GB'],
  AE: ['UAE'],
};

// Alternative names and main cities of frequently requested destinations we do NOT serve.
const UNSERVED_ALIASES: Record<string, string[]> = {
  PK: ['karachi', 'lahore', 'islamabad', 'rawalpindi', 'faisalabad', 'peshawar', 'multan', 'sialkot', 'quetta', 'gujranwala', 'port qasim', '卡拉奇', '拉合尔', '伊斯兰堡'],
  SA: ['ksa', 'saudi', 'riyadh', 'jeddah', 'jiddah', 'dammam', 'mecca', 'makkah', 'khobar', '沙特', '利雅得', '吉达', '达曼'],
  NG: ['lagos', 'abuja', 'kano', 'port harcourt', '拉各斯'],
  KE: ['nairobi', 'mombasa'],
  EG: ['cairo'],
  ZA: ['johannesburg', 'cape town', 'durban'],
  GH: ['accra'],
  TZ: ['dar es salaam'],
  ET: ['addis ababa'],
  MA: ['casablanca'],
  DZ: ['algiers'],
  BR: ['sao paulo', 'rio de janeiro', '圣保罗'],
  AR: ['buenos aires'],
  CO: ['bogota'],
  PE: ['callao'],
  CL: ['valparaiso'],
  TR: ['turkey', 'istanbul', 'ankara', 'izmir', 'mersin'],
  ID: ['jakarta', 'surabaya', '雅加达'],
  QA: ['doha'],
  OM: ['muscat'],
  IQ: ['baghdad', 'basra'],
  IR: ['tehran', 'bandar abbas'],
  AF: ['kabul'],
  LK: ['colombo'],
  NP: ['kathmandu'],
  JO: ['amman'],
  LB: ['beirut'],
  IL: ['tel aviv', 'haifa'],
  RU: ['moscow', 'saint petersburg', 'st petersburg', 'vladivostok', '莫斯科'],
  NZ: ['auckland', 'christchurch'],
  CI: ['ivory coast'],
  MM: ['burma', 'yangon'],
  CD: ['congo', 'drc'],
  TL: ['east timor'],
  SZ: ['swaziland'],
  PS: ['palestine'],
};

// Origin side, US territories and Spanish territories: matched (so they can't be mistaken
// for another country) but never reported as served or unserved.
const NEUTRAL_CODES = new Set(['CN', 'HK', 'MO', 'PR', 'GU', 'VI', 'AS', 'MP', 'UM', 'IC', 'EA']);
// Continent names are neutral too, so "South America" is not read as "America" (USA).
const NEUTRAL_ALIASES = [
  'china', 'hong kong', 'macau', 'macao', 'canary islands', 'puerto rico',
  'north america', 'south america', 'latin america', 'central america', 'americas', 'new england',
];

// ICU pseudo-regions that are not real destinations.
const PSEUDO_REGION_CODES = new Set(['EU', 'EZ', 'UN', 'QO', 'ZZ', 'XA', 'XB', 'AC', 'CP', 'DG', 'TA']);

// English country names that are also everyday words, first names or US states.
const AMBIGUOUS_TERMS = new Set(['jersey', 'georgia', 'chad', 'jordan', 'guernsey', 'reunion', 'heard & mcdonald islands']);

const CJK_PATTERN = /[\u3400-\u9fff]/;

function normalize(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\u2019\u2018`]/g, "'")
    .replace(/（/g, '(')
    .replace(/）/g, ')');
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Expands an ICU display name into the spellings people actually type. */
function nameVariants(displayName: string): string[] {
  const base = normalize(displayName).toLowerCase();
  const variants = new Set<string>([base]);
  const withoutParens = base.replace(/\s*\([^)]*\)\s*/g, ' ').trim();
  variants.add(withoutParens);
  for (const v of [...variants]) {
    if (v.includes(' & ')) variants.add(v.replace(/ & /g, ' and '));
    if (v.startsWith('st. ')) {
      variants.add(v.replace(/^st\. /, 'saint '));
      variants.add(v.replace(/^st\. /, 'st '));
    }
    if (v.includes('.')) variants.add(v.replace(/\./g, ''));
  }
  return [...variants].filter((v) => v.length > 1);
}

function buildTerm(text: string, code: string, kind: TermKind, caseSensitive = false): Term {
  const value = caseSensitive ? text : normalize(text).toLowerCase();
  const cjk = CJK_PATTERN.test(value);
  return {
    text: value,
    code,
    kind,
    cjk,
    caseSensitive,
    weak: WEAK_ALIASES.has(value),
    regex: cjk ? null : new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(value)}(?![\\p{L}\\p{N}])`, `gu`),
  };
}

function buildTerms(): Term[] {
  const servedCodes = new Set(TARGET_ROUTES.map((r) => r.code));
  const en = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
  const zh = new Intl.DisplayNames(['zh'], { type: 'region', fallback: 'none' });
  const terms = new Map<string, Term>();

  const add = (text: string, code: string, kind: TermKind, caseSensitive = false) => {
    const term = buildTerm(text, code, kind, caseSensitive);
    if (!term.cjk && !caseSensitive && AMBIGUOUS_TERMS.has(term.text)) return;
    const key = `${caseSensitive ? 'cs' : 'ci'}:${term.text}`;
    if (!terms.has(key)) terms.set(key, term);
  };

  // Served names first so they win any collision with ICU names.
  for (const route of TARGET_ROUTES) {
    add(route.name, route.code, 'served');
    const enName = en.of(route.code);
    if (enName) nameVariants(enName).forEach((v) => add(v, route.code, 'served'));
    const zhName = zh.of(route.code);
    if (zhName) add(zhName, route.code, 'served');
    (SERVED_ALIASES[route.code] ?? []).forEach((alias) => add(alias, route.code, 'served'));
    (SERVED_UPPERCASE_CODES[route.code] ?? []).forEach((abbr) => add(abbr, route.code, 'served', true));
  }

  NEUTRAL_ALIASES.forEach((alias) => add(alias, 'CN', 'neutral'));
  Object.entries(UNSERVED_ALIASES).forEach(([code, aliases]) => aliases.forEach((alias) => add(alias, code, 'unserved')));

  // Every other ISO region is unserved (or neutral for the origin side / territories).
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b);
      if (servedCodes.has(code) || PSEUDO_REGION_CODES.has(code)) continue;
      const enName = en.of(code);
      if (!enName || enName === code) continue;
      const kind: TermKind = NEUTRAL_CODES.has(code) ? 'neutral' : 'unserved';
      nameVariants(enName).forEach((v) => add(v, code, kind));
      const zhName = zh.of(code);
      if (zhName) {
        add(zhName, code, kind);
        const zhShort = normalize(zhName).replace(/\s*\([^)]*\)\s*/g, '');
        if (zhShort.length > 1) add(zhShort, code, kind);
      }
    }
  }

  // Longest first: "Indonesia" must claim its span before "India", "North Korea" before "Korea".
  return [...terms.values()].sort((x, y) => y.text.length - x.text.length);
}

const TERMS = buildTerms();
const UNSERVED_NAMES = new Intl.DisplayNames(['en'], { type: 'region', fallback: 'none' });
const ROUTES_BY_CODE = new Map(TARGET_ROUTES.map((route) => [route.code, route]));

function maskSpan(text: string, start: number, end: number): string {
  return text.slice(0, start) + ' '.repeat(end - start) + text.slice(end);
}

export function resolveDestinations(input: string): DestinationMatch {
  let original = normalize(input);
  let lower = original.toLowerCase();
  const canMaskOriginal = lower.length === original.length;
  const hits: Array<{ index: number; term: Term }> = [];

  for (const term of TERMS) {
    if (term.caseSensitive && !canMaskOriginal) continue;
    const haystack = term.caseSensitive ? original : lower;
    // Cheap substring pre-check; the Unicode word-boundary regex only runs on candidates.
    if (!haystack.includes(term.text)) continue;

    const spans: Array<[number, number]> = [];
    if (term.cjk) {
      let index = haystack.indexOf(term.text);
      while (index !== -1) {
        spans.push([index, index + term.text.length]);
        index = haystack.indexOf(term.text, index + term.text.length);
      }
    } else if (term.regex) {
      term.regex.lastIndex = 0;
      for (const match of haystack.matchAll(term.regex)) {
        spans.push([match.index, match.index + match[0].length]);
      }
    }

    for (const [start, end] of spans) {
      hits.push({ index: start, term });
      lower = maskSpan(lower, start, end);
      if (canMaskOriginal) original = maskSpan(original, start, end);
    }
  }

  hits.sort((x, y) => x.index - y.index);
  const strongHits = hits.filter((hit) => !hit.term.weak && hit.term.kind !== 'neutral');
  const effectiveHits = strongHits.length > 0 ? hits.filter((hit) => !hit.term.weak) : hits;
  const served: CountryRoute[] = [];
  const unserved: UnservedDestination[] = [];
  for (const { term } of effectiveHits) {
    if (term.kind === 'served') {
      const route = ROUTES_BY_CODE.get(term.code);
      if (route && !served.includes(route)) served.push(route);
    } else if (term.kind === 'unserved' && !unserved.some((u) => u.code === term.code)) {
      const name = UNSERVED_NAMES.of(term.code) ?? term.code;
      unserved.push({ code: term.code, name: term.code === 'TR' ? 'Turkey' : name });
    }
  }

  return { served, unserved };
}

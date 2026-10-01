/**
 * JCD Forwarder RAG Retriever
 * Fast lexical keyword scoring for logistics context retrieval.
 * All matching is whole-word: substring matching made "what" hit Austria ("at")
 * and "shipping" hit India ("in"), injecting unrelated country data into answers.
 */

import { ALL_KNOWLEDGE_CHUNKS, KnowledgeChunk } from './knowledgeBase';
import { resolveDestinations } from './destinations';

const STOPWORDS = new Set([
  'a', 'an', 'the', 'in', 'on', 'at', 'to', 'for', 'of', 'and', 'or', 'is', 'are',
  'was', 'were', 'it', 'with', 'from', 'as', 'by', 'this', 'that', 'i', 'you', 'we',
  'can', 'do', 'does', 'how', 'what', 'which', 'who', 'where', 'when', 'why', 'please',
  'tell', 'me', 'about', 'need', 'want', 'help',
  // Words that appear in nearly every chunk title and carry no signal on their own.
  'have', 'has', 'your', 'our', 'my', 'us', 'be', 'will', 'would', 'could', 'should',
  'any', 'kind', 'get', 'give', 'there', 'ship', 'ships', 'shipping', 'china', 'jcd', 'forwarder'
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 1 && !STOPWORDS.has(word));
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function wordRegex(term: string): RegExp {
  return new RegExp(`(?<![a-z0-9])${escapeRegExp(term.toLowerCase())}(?![a-z0-9])`);
}

/** Whole-word hit, or a substring hit for tokens long enough to be unambiguous ("calculat" in "calculator"). */
function tokenHits(token: string, text: string, words: Set<string>): boolean {
  const singular = token.length > 3 && token.endsWith('s') ? token.slice(0, -1) : token;
  if (words.has(token) || words.has(singular)) return true;
  return singular.length >= 4 && text.includes(singular);
}

interface IndexedChunk {
  chunk: KnowledgeChunk;
  titleLower: string;
  titleWords: Set<string>;
  contentLower: string;
  contentWords: Set<string>;
  keywords: Array<{ text: string; words: Set<string>; regex: RegExp }>;
  originRegexes: RegExp[];
}

const INDEX: IndexedChunk[] = ALL_KNOWLEDGE_CHUNKS.map((chunk) => {
  const titleLower = chunk.title.toLowerCase();
  const contentLower = chunk.content.toLowerCase();
  return {
    chunk,
    titleLower,
    titleWords: new Set(tokenize(chunk.title)),
    contentLower,
    contentWords: new Set(tokenize(chunk.content)),
    keywords: chunk.keywords.map((kw) => ({
      text: kw.toLowerCase(),
      words: new Set(tokenize(kw)),
      regex: wordRegex(kw),
    })),
    // Origin chunk keywords start with the hub's English and Chinese names.
    originRegexes: chunk.category === 'origin' ? [wordRegex(chunk.keywords[0] ?? '')] : [],
  };
});

export interface RetrievalResult {
  chunk: KnowledgeChunk;
  score: number;
}

export function retrieveKnowledge(query: string, topK = 4): RetrievalResult[] {
  const queryTokens = tokenize(query);
  const normalizedQuery = query.toLowerCase().trim();
  const servedChunkIds = new Set(
    resolveDestinations(query).served.map((route) => `country-${route.code.toLowerCase()}`)
  );

  if (queryTokens.length === 0 && servedChunkIds.size === 0) {
    const fallback = ALL_KNOWLEDGE_CHUNKS.find((c) => c.id === 'company-overview');
    return fallback ? [{ chunk: fallback, score: 10 }] : [];
  }

  const scored: RetrievalResult[] = INDEX.map((entry) => {
    let score = 0;

    // 1. Direct query substring match in title
    if (normalizedQuery.length > 3 && entry.titleLower.includes(normalizedQuery)) {
      score += 30;
    }

    // 2. Whole-word keyword phrase matches
    for (const kw of entry.keywords) {
      if (kw.regex.test(normalizedQuery)) {
        score += 20;
      }
    }

    // 3. Token-based matching
    for (const token of queryTokens) {
      if (tokenHits(token, entry.titleLower, entry.titleWords)) {
        score += 8;
      }
      for (const kw of entry.keywords) {
        if (tokenHits(token, kw.text, kw.words)) {
          score += 5;
        }
      }
      if (tokenHits(token, entry.contentLower, entry.contentWords)) {
        score += 1.5;
      }
    }

    // 4. Country routes: only boosted when the resolver confirms a served destination
    if (servedChunkIds.has(entry.chunk.id)) {
      score += 60;
    }

    // 5. Origin hub boosting (English name whole-word, Chinese name substring)
    if (entry.chunk.category === 'origin') {
      const chineseName = entry.chunk.keywords[1];
      if (entry.originRegexes.some((re) => re.test(normalizedQuery)) || (chineseName && query.includes(chineseName))) {
        score += 35;
      }
    }

    return { chunk: entry.chunk, score };
  });

  // Filter chunks with positive relevance and sort descending
  const relevant = scored
    .filter((res) => res.score > 3)
    .sort((a, b) => b.score - a.score);

  // If top matches are found, return topK
  if (relevant.length > 0) {
    return relevant.slice(0, topK);
  }

  // Fallback to company overview + DDP shipping chunks
  const defaultIds = ['company-overview', 'service-ddp-shipping'];
  const defaults = ALL_KNOWLEDGE_CHUNKS.filter((c) => defaultIds.includes(c.id)).map((chunk) => ({
    chunk,
    score: 5
  }));

  return defaults;
}

export function formatContextForPrompt(results: RetrievalResult[]): string {
  if (!results || results.length === 0) return '';

  return results
    .map((r, idx) => {
      return `--- KNOWLEDGE SOURCE [${idx + 1}]: ${r.chunk.title} (${r.chunk.category.toUpperCase()}) ---\n${r.chunk.content}`;
    })
    .join('\n\n');
}

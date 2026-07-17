import type { BenchNewsItem } from "../schema/newsItem.js";
import { hashSlug, normalizeTitle } from "./newsMapping.js";

const COL_DATE = 1;
const COL_DOMAIN = 3;
const COL_URL = 4;
const COL_ORGANIZATIONS = 11;
const COL_TRANSLATION_INFO = 25;
const MIN_COLUMNS = COL_TRANSLATION_INFO + 1;
const ARCHIVE_MAX_ITEMS = 10;

export interface GkgRow {
  date: string;
  domain: string;
  url: string;
  organizations: string;
  translationInfo: string;
}

export interface ArchiveMatch {
  date: string;
  url: string;
  domain: string;
}

export interface ArchiveWindowRequest {
  symbol: string;
  matchTerm: string;
}

export function parseGkgRow(line: string): GkgRow | null {
  if (!line) return null;
  const cols = line.split("\t");
  if (cols.length < MIN_COLUMNS) return null;
  return {
    date: cols[COL_DATE],
    domain: cols[COL_DOMAIN],
    url: cols[COL_URL],
    organizations: cols[COL_ORGANIZATIONS],
    translationInfo: cols[COL_TRANSLATION_INFO],
  };
}

export function isEnglishRow(row: GkgRow): boolean {
  return row.translationInfo.trim() === "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function matchesTerm(haystack: string, term: string): boolean {
  if (!haystack) return false;
  const pattern = new RegExp(`\\b${escapeRegExp(term.toLowerCase())}\\b`);
  return pattern.test(haystack.toLowerCase());
}

export function rowMatchesCompany(row: GkgRow, matchTerm: string): boolean {
  return matchesTerm(row.organizations, matchTerm) || matchesTerm(row.url, matchTerm);
}

export function extractArchiveMatches(csv: string, requests: ArchiveWindowRequest[]): Map<string, ArchiveMatch[]> {
  const bySymbol = new Map<string, ArchiveMatch[]>();
  for (const request of requests) bySymbol.set(request.symbol, []);

  for (const line of csv.split("\n")) {
    if (!line) continue;
    const row = parseGkgRow(line);
    if (!row) continue;
    if (!isEnglishRow(row)) continue;

    for (const request of requests) {
      if (rowMatchesCompany(row, request.matchTerm)) {
        bySymbol.get(request.symbol)!.push({ date: row.date, url: row.url, domain: row.domain });
      }
    }
  }
  return bySymbol;
}

function stripKnownExtension(segment: string): string {
  return segment.replace(/\.(html?|php|aspx?)$/i, "");
}

function slugToTitle(segment: string): string | null {
  const stripped = stripKnownExtension(segment);
  let cleaned = stripped.replace(/[-_]+/g, " ").trim();
  cleaned = cleaned.replace(/\s+\d+$/, "").trim();
  if (!cleaned) return null;

  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0) return null;
  if (!words.some((word) => /[a-zA-Z]/.test(word))) return null;

  return words.map((word) => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
}

export function deriveTitleFromUrl(url: string): string | null {
  let pathname: string;
  try {
    pathname = new URL(url).pathname;
  } catch {
    return null;
  }

  const segments = pathname.split("/").filter(Boolean);
  for (let i = segments.length - 1; i >= 0; i--) {
    const title = slugToTitle(segments[i]);
    if (title) return title;
  }
  return null;
}

export function gkgDateToIso(date: string): string {
  const match = /^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})$/.exec(date);
  if (!match) throw new Error(`unrecognized GKG DATE: ${date}`);
  const [, year, month, day, hour, minute, second] = match;
  return `${year}-${month}-${day}T${hour}:${minute}:${second}Z`;
}

export function mapArchiveMatches(matches: ArchiveMatch[], cutoffIso: string): BenchNewsItem[] {
  const cutoffMs = Date.parse(cutoffIso);
  const seenTitles = new Set<string>();
  const candidates: { item: BenchNewsItem; ms: number }[] = [];

  for (const match of matches) {
    const publishedAt = gkgDateToIso(match.date);
    const ms = Date.parse(publishedAt);
    if (ms > cutoffMs) continue;

    const title = deriveTitleFromUrl(match.url);
    if (!title) continue;

    const normalized = normalizeTitle(title);
    if (seenTitles.has(normalized)) continue;
    seenTitles.add(normalized);

    candidates.push({
      ms,
      item: {
        id: `gdelt-arch-${hashSlug(match.url)}`,
        title,
        published_at: publishedAt,
        url: match.url,
        source: `gdelt-arch:${match.domain}`,
      },
    });
  }

  candidates.sort((a, b) => b.ms - a.ms);
  return candidates.slice(0, ARCHIVE_MAX_ITEMS).map((candidate) => candidate.item);
}

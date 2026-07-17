import { promises as fs } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import {
  deriveTitleFromUrl,
  extractArchiveMatches,
  gkgDateToIso,
  isEnglishRow,
  mapArchiveMatches,
  parseGkgRow,
  rowMatchesCompany,
} from "../../src/generate/gdeltArchiveMapping.js";
import type { ArchiveMatch, ArchiveTerms, GkgRow } from "../../src/generate/gdeltArchiveMapping.js";
import { readArchiveCsvLive } from "../../src/generate/archiveSource.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const FIXTURE_ZIP = join(HERE, "../fixtures/gdelt-archive/sample.gkg.csv.zip");
const FIXTURE_CSV = join(HERE, "../fixtures/gdelt-archive/sample.gkg.csv");

describe("parseGkgRow", () => {
  it("parses a real GKG 2.1 row against verified column indices", async () => {
    const csv = await fs.readFile(FIXTURE_CSV, "utf8");
    const [firstLine] = csv.split("\n");
    const row = parseGkgRow(firstLine);
    expect(row).not.toBeNull();
    expect(row?.date).toBe("20260323133000");
    expect(row?.domain).toBe("example.com");
    expect(row?.url).toBe("https://example.com/investing/2026/03/23/micron-technology-beats-earnings-estimates/");
    expect(row?.organizations).toBe("micron technology;wall street");
    expect(row?.translationInfo).toBe("");
  });

  it("returns null for a short/malformed line", () => {
    expect(parseGkgRow("a\tb\tc")).toBeNull();
    expect(parseGkgRow("")).toBeNull();
  });

  it("unzips a real archive file via the macOS unzip binary and yields parseable rows", async () => {
    const csv = await readArchiveCsvLive(FIXTURE_ZIP);
    const rows = csv.split("\n").filter(Boolean).map(parseGkgRow);
    expect(rows.filter(Boolean)).toHaveLength(5);
  });
});

describe("isEnglishRow", () => {
  it("treats empty TranslationInfo as English", () => {
    const row = parseGkgRow("x\tx\tx\tx\tx\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t\t");
    expect(row && isEnglishRow(row)).toBe(true);
  });

  it("treats a non-empty TranslationInfo as non-English", () => {
    const cols = new Array(26).fill("");
    cols[25] = "fra;French;Example Media";
    expect(isEnglishRow(parseGkgRow(cols.join("\t"))!)).toBe(false);
  });
});

const MU_TERMS: ArchiveTerms = { strongTerms: ["micron technology"], weakTerm: "micron" };
const AAPL_TERMS: ArchiveTerms = { strongTerms: ["apple inc"], weakTerm: "apple" };
const MSFT_TERMS: ArchiveTerms = { strongTerms: ["microsoft corp", "microsoft corporation"], weakTerm: "microsoft" };
const FCX_TERMS: ArchiveTerms = { strongTerms: ["freeport mcmoran"], weakTerm: "freeport" };
const PG_TERMS: ArchiveTerms = { strongTerms: ["procter gamble", "procter and gamble"], weakTerm: "procter" };
const MRVL_TERMS: ArchiveTerms = { strongTerms: ["marvell technology"], weakTerm: "marvell" };
const CAT_TERMS: ArchiveTerms = { strongTerms: ["caterpillar inc"], weakTerm: "caterpillar" };

function rowFrom(overrides: { org?: string; url?: string }): GkgRow {
  const cols = new Array(26).fill("");
  cols[11] = overrides.org ?? "";
  cols[4] = overrides.url ?? "https://example.com/story";
  return parseGkgRow(cols.join("\t"))!;
}

describe("rowMatchesCompany", () => {
  it("matches via strong term against V1Organizations", () => {
    const row = rowFrom({ org: "MICRON TECHNOLOGY;wall street" });
    expect(rowMatchesCompany(row, MU_TERMS, "MU.US")).toBe(true);
  });

  it("does not false-positive on a substring spanning word boundaries (apple vs applebaum)", () => {
    const row = rowFrom({ org: "anne applebaum;donald trump", url: "https://example.com/story" });
    expect(rowMatchesCompany(row, AAPL_TERMS, "AAPL.US")).toBe(false);
  });

  it("does not match an unrelated org list or URL", () => {
    const row = rowFrom({ org: "acme corp", url: "https://example.com/quarterly-earnings-recap" });
    expect(rowMatchesCompany(row, MU_TERMS, "MU.US")).toBe(false);
  });

  it("falls back to matching the URL via weak term + finance-context corroborator", () => {
    const row = rowFrom({ org: "tim cook", url: "https://example.com/2026/03/23/microsoft-earnings-beat-estimates" });
    expect(rowMatchesCompany(row, MSFT_TERMS, "MSFT.US")).toBe(true);
  });

  it("rejects: harraseeket freeport maine ice bar (weak-only, no corroborator)", () => {
    const row = rowFrom({ org: "harraseeket inn", url: "https://example.com/travel/harraseeket-freeport-maine-ice-bar" });
    expect(rowMatchesCompany(row, FCX_TERMS, "FCX.US")).toBe(false);
  });

  it("rejects: avatar fire and ash digital release (orgs-tagged procter, no corroborator)", () => {
    const row = rowFrom({ org: "procter", url: "https://example.com/movies/avatar-fire-and-ash-digital-release" });
    expect(rowMatchesCompany(row, PG_TERMS, "PG.US")).toBe(false);
  });

  it("rejects: LRB Andrew Marvell literary piece (weak-only, no corroborator)", () => {
    const row = rowFrom({ org: "andrew marvell", url: "https://example.com/books/lrb-andrew-marvell-poetry-essay" });
    expect(rowMatchesCompany(row, MRVL_TERMS, "MRVL.US")).toBe(false);
  });

  it("rejects: hungry caterpillar book piece (weak-only, no corroborator)", () => {
    const row = rowFrom({ org: "eric carle", url: "https://example.com/books/the-very-hungry-caterpillar-review" });
    expect(rowMatchesCompany(row, CAT_TERMS, "CAT.US")).toBe(false);
  });

  it("accepts: freeport-mcmoran copper q1 via strong term", () => {
    const row = rowFrom({ org: "", url: "https://example.com/mining/freeport-mcmoran-copper-q1-results" });
    expect(rowMatchesCompany(row, FCX_TERMS, "FCX.US")).toBe(true);
  });

  it("accepts: weak micron article with stock in slug via corroborator", () => {
    const row = rowFrom({ org: "micron", url: "https://example.com/investing/micron-stock-rallies-today" });
    expect(rowMatchesCompany(row, MU_TERMS, "MU.US")).toBe(true);
  });

  it("accepts (recall guard): why-micron-stock-crashed-after-blowout-earnings", () => {
    const row = rowFrom({
      org: "",
      url: "https://finance.example.com/why-micron-stock-crashed-after-blowout-earnings",
    });
    expect(rowMatchesCompany(row, MU_TERMS, "MU.US")).toBe(true);
  });

  it("keeps the amdocs-style substring guard for weak single tokens", () => {
    const amdTerms: ArchiveTerms = { strongTerms: ["advanced micro devices"], weakTerm: "amd" };
    const row = rowFrom({ org: "amdocs ltd", url: "https://example.com/tech/amdocs-quarterly-report" });
    expect(rowMatchesCompany(row, amdTerms, "AMD.US")).toBe(false);
  });
});

describe("extractArchiveMatches", () => {
  it("filters rows for all requested symbols in a single scan, English-only", async () => {
    const csv = await fs.readFile(FIXTURE_CSV, "utf8");
    const matches = extractArchiveMatches(csv, [
      { symbol: "MU.US", terms: MU_TERMS },
      { symbol: "AAPL.US", terms: AAPL_TERMS },
    ]);
    expect(matches.get("MU.US")).toHaveLength(1);
    expect(matches.get("MU.US")?.[0].domain).toBe("example.com");
    expect(matches.get("AAPL.US")).toHaveLength(0);
  });

  it("excludes the non-English row even though it mentions the company", async () => {
    const csv = await fs.readFile(FIXTURE_CSV, "utf8");
    const matches = extractArchiveMatches(csv, [{ symbol: "MU.US", terms: MU_TERMS }]);
    expect(matches.get("MU.US")?.some((m) => m.domain === "foreign.example")).toBe(false);
  });
});

describe("gkgDateToIso", () => {
  it("converts a GKG DATE stamp to an ISO instant", () => {
    expect(gkgDateToIso("20260323133000")).toBe("2026-03-23T13:30:00Z");
  });

  it("throws on an unrecognized format", () => {
    expect(() => gkgDateToIso("not-a-date")).toThrow(/unrecognized/);
  });
});

describe("deriveTitleFromUrl", () => {
  it("derives a title from a hyphenated slug", () => {
    expect(deriveTitleFromUrl("https://example.com/investing/2026/03/23/micron-technology-beats-earnings-estimates/")).toBe(
      "Micron Technology Beats Earnings Estimates",
    );
  });

  it("strips a trailing numeric id from a slug", () => {
    expect(deriveTitleFromUrl("https://finance.yahoo.com/markets/stocks/articles/sectors-not-getting-hit-market-123500143.html")).toBe(
      "Sectors Not Getting Hit Market",
    );
  });

  it("skips a bare numeric id with no usable slug", () => {
    expect(deriveTitleFromUrl("https://shortid.com/12345")).toBeNull();
  });

  it("skips a query-only URL with no path segments", () => {
    expect(deriveTitleFromUrl("https://queryonly.com/?id=555")).toBeNull();
  });

  it("skips a malformed URL", () => {
    expect(deriveTitleFromUrl("not a url")).toBeNull();
  });

  it("falls back to an earlier path segment when the last one is a bare numeric id", () => {
    expect(deriveTitleFromUrl("https://example.com/micron-earnings-report/12345")).toBe("Micron Earnings Report");
  });

  it("skips an unknown-extension numeric id (126309170.cms)", () => {
    expect(deriveTitleFromUrl("https://timesofindia.example.com/business/126309170.cms")).toBeNull();
  });

  it("skips a bare alphanumeric SKU with no usable words (N82E16883151782)", () => {
    expect(deriveTitleFromUrl("https://newegg.example.com/p/N82E16883151782")).toBeNull();
  });

  it("skips a bare base32-ish id with no usable words (WNS3RGRWEFHZLI27ITWJDN6SVM)", () => {
    expect(deriveTitleFromUrl("https://short.example.com/WNS3RGRWEFHZLI27ITWJDN6SVM")).toBeNull();
  });

  it("leaves normal hyphen slugs unaffected", () => {
    expect(deriveTitleFromUrl("https://example.com/why-micron-stock-crashed-after-blowout-earnings")).toBe(
      "Why Micron Stock Crashed After Blowout Earnings",
    );
  });
});

describe("mapArchiveMatches", () => {
  const CUTOFF = "2026-03-25T20:00:00-04:00";

  function match(overrides: Partial<ArchiveMatch> = {}): ArchiveMatch {
    return {
      date: "20260323133000",
      url: "https://example.com/story-one",
      domain: "example.com",
      ...overrides,
    };
  }

  it("drops matches whose title cannot be derived", () => {
    const items = mapArchiveMatches([match({ url: "https://shortid.com/12345" })], CUTOFF);
    expect(items).toHaveLength(0);
  });

  it("dedupes by normalized derived title", () => {
    const items = mapArchiveMatches(
      [match({ url: "https://a.com/micron-beats-estimates" }), match({ url: "https://b.com/micron-beats-estimates" })],
      CUTOFF,
    );
    expect(items).toHaveLength(1);
  });

  it("sorts by date descending and caps at 10", () => {
    const matches = Array.from({ length: 15 }, (_, i) =>
      match({ url: `https://a.com/story-alpha-${String.fromCharCode(97 + i)}`, date: "20260323133000" }),
    );
    const items = mapArchiveMatches(matches, CUTOFF);
    expect(items).toHaveLength(10);
  });

  it("labels items with the gdelt-arch:<domain> source", () => {
    const items = mapArchiveMatches([match()], CUTOFF);
    expect(items[0].source).toBe("gdelt-arch:example.com");
  });

  it("rejects a match dated after cutoff", () => {
    const items = mapArchiveMatches([match({ date: "20260326120000" })], CUTOFF);
    expect(items).toHaveLength(0);
  });
});

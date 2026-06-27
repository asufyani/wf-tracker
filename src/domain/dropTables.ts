import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

export type DropRarity =
  | "Very Common"
  | "Common"
  | "Uncommon"
  | "Rare"
  | "Ultra Rare"
  | "Legendary"
  | "Beyond Legendary (Under Review)";

export interface DropEntry {
  itemName: string;
  rarity: DropRarity;
  chance: number;
  rotation?: string;
}

export interface DropSource {
  id: string;
  name: string;
  category: string;
  drops: DropEntry[];
}

export interface FarmOption extends DropEntry {
  sourceId: string;
  sourceName: string;
  category: string;
}

export interface WishlistRelicReward {
  itemName: string;
  rarity: DropRarity;
  chance: number;
}

export interface WishlistRelicFarm {
  missionSourceId: string;
  missionName: string;
  relicName: string;
  relicDropRarity: DropRarity;
  relicDropChance: number;
  rotation?: string;
  wishedParts: WishlistRelicReward[];
}

export interface DropTableDataset {
  metadata: {
    sourceUrl: string;
    scrapedAt: string;
    lastUpdated?: string;
    sourceCount: number;
    dropCount: number;
  };
  sources: DropSource[];
  sourceToDrops: Record<string, DropEntry[]>;
  itemToSources: Record<string, FarmOption[]>;
}

interface ParseMetadata {
  sourceUrl: string;
  scrapedAt: string;
}

const RARITIES: DropRarity[] = [
  "Very Common",
  "Common",
  "Uncommon",
  "Rare",
  "Ultra Rare",
  "Legendary",
  "Beyond Legendary (Under Review)"
];

const rarityPattern = RARITIES.map(escapeRegex).join("|");
const dropLinePattern = new RegExp(`^(.*?)\\s*(${rarityPattern})\\s*\\((\\d+(?:\\.\\d+)?)%\\)$`);
const dropMetaPattern = new RegExp(`^(${rarityPattern})\\s*\\((\\d+(?:\\.\\d+)?)%\\)$`);

export function parseDropTableHtml(html: string, metadata: ParseMetadata): DropTableDataset {
  const $ = cheerio.load(html);
  const lines = extractLines(html);
  const lastUpdated = lines
    .find((line) => line.startsWith("Last Update:"))
    ?.replace("Last Update:", "")
    .trim();
  const structuredSources = parseStructuredTables($);
  const sources = structuredSources.length > 0 ? structuredSources : parseLineSources(lines);

  return normalizeSources(sources, {
    ...metadata,
    lastUpdated
  });
}

export function rankDropSourcesForItem(dataset: DropTableDataset, itemName: string): FarmOption[] {
  return [...(dataset.itemToSources[itemName.toLowerCase()] ?? [])].sort(
    (left, right) =>
      right.chance - left.chance ||
      left.sourceName.localeCompare(right.sourceName) ||
      (left.rotation ?? "").localeCompare(right.rotation ?? "")
  );
}

export function listPrimePartCandidates(dataset: DropTableDataset): string[] {
  const candidates = new Map<string, string>();

  for (const source of dataset.sources) {
    if (source.category !== "Relics") {
      continue;
    }

    for (const drop of source.drops) {
      if (!drop.itemName.toLowerCase().includes("prime")) {
        continue;
      }

      candidates.set(drop.itemName.toLowerCase(), drop.itemName);
    }
  }

  return [...candidates.values()].sort((left, right) => left.localeCompare(right));
}

export function buildWishlistRelicFarms(
  dataset: DropTableDataset,
  wishlistPartNames: string[]
): WishlistRelicFarm[] {
  const wishedPartKeys = new Set(wishlistPartNames.map(normalizeItemKey));
  if (wishedPartKeys.size === 0) {
    return [];
  }

  const wishedPartsByRelicName = new Map<string, WishlistRelicReward[]>();

  for (const source of dataset.sources) {
    if (source.category !== "Relics" || !isIntactRelicSource(source.name)) {
      continue;
    }

    const wishedParts = source.drops
      .filter((drop) => wishedPartKeys.has(normalizeItemKey(drop.itemName)))
      .map((drop) => ({
        itemName: drop.itemName,
        rarity: drop.rarity,
        chance: drop.chance
      }))
      .sort((left, right) => left.itemName.localeCompare(right.itemName));

    if (wishedParts.length > 0) {
      wishedPartsByRelicName.set(normalizeItemKey(baseRelicName(source.name)), wishedParts);
    }
  }

  const farms: WishlistRelicFarm[] = [];

  for (const source of dataset.sources) {
    if (source.category !== "Missions") {
      continue;
    }

    for (const drop of source.drops) {
      const wishedParts = wishedPartsByRelicName.get(normalizeItemKey(drop.itemName));
      if (!wishedParts) {
        continue;
      }

      farms.push({
        missionSourceId: source.id,
        missionName: source.name,
        relicName: drop.itemName,
        relicDropRarity: drop.rarity,
        relicDropChance: drop.chance,
        ...(drop.rotation ? { rotation: drop.rotation } : {}),
        wishedParts
      });
    }
  }

  return farms.sort(
    (left, right) =>
      right.relicDropChance - left.relicDropChance ||
      left.missionName.localeCompare(right.missionName) ||
      (left.rotation ?? "").localeCompare(right.rotation ?? "") ||
      left.relicName.localeCompare(right.relicName)
  );
}

function parseStructuredTables($: cheerio.CheerioAPI): DropSource[] {
  const sources: DropSource[] = [];
  let currentCategory = "";

  $("h3, h4").each((_, heading) => {
    const category = parseHeadingCategory(normalizeText($(heading).text()));
    if (!category) {
      return;
    }

    currentCategory = category;
    if (shouldSkipCategory(currentCategory)) {
      return;
    }

    const table = $(heading).nextAll("table").first();
    if (table.length === 0) {
      return;
    }

    parseTableRows($, table.find("tr").toArray(), currentCategory, sources);
  });

  return sources;
}

function parseTableRows(
  $: cheerio.CheerioAPI,
  rows: AnyNode[],
  currentCategory: string,
  sources: DropSource[]
): void {
  let currentSource: DropSource | undefined;
  let currentRotation: string | undefined;

  for (const row of rows) {
    const rowElement = $(row);
    const thTexts = rowElement
      .find("th")
      .toArray()
      .map((cell) => normalizeText($(cell).text()))
      .filter(Boolean);
    const tdTexts = rowElement
      .find("td")
      .toArray()
      .map((cell) => normalizeText($(cell).text()));

    if (rowElement.hasClass("blank-row") || [...thTexts, ...tdTexts].every((cell) => !cell)) {
      currentSource = undefined;
      currentRotation = undefined;
      continue;
    }

    if (tdTexts.length >= 2) {
      const drop = parseTableDrop(tdTexts, currentRotation);
      if (drop && currentSource) {
        currentSource.drops.push(drop);
      }
      continue;
    }

    if (thTexts.length === 0) {
      continue;
    }

    const headerText = thTexts.join(" ");
    const rotation = parseRotation(headerText);
    if (rotation) {
      currentRotation = rotation;
      continue;
    }

    if (isStageHeader(headerText) || isColumnHeader(headerText)) {
      continue;
    }

    const sourceName = thTexts.length > 1 && thTexts[1].includes("Drop Chance:") ? thTexts[0] : headerText;
    currentSource = {
      id: uniqueSourceId(slugify(sourceName), sources),
      name: sourceName,
      category: currentCategory,
      drops: []
    };
    sources.push(currentSource);
    currentRotation = undefined;
  }
}

function parseLineSources(lines: string[]): DropSource[] {
  const sources: DropSource[] = [];
  let currentCategory = "";
  let currentSource: DropSource | undefined;
  let currentRotation: string | undefined;

  for (const line of lines) {
    const category = parseCategory(line);
    if (category) {
      currentCategory = category;
      currentSource = undefined;
      currentRotation = undefined;
      continue;
    }

    if (!currentCategory || isIgnoredLine(line)) {
      continue;
    }

    const rotation = parseRotation(line);
    if (rotation) {
      currentRotation = rotation;
      continue;
    }

    const drop = parseDropLine(line, currentRotation);
    if (drop && currentSource) {
      currentSource.drops.push(drop);
      continue;
    }

    currentSource = {
      id: uniqueSourceId(slugify(line), sources),
      name: line,
      category: currentCategory,
      drops: []
    };
    sources.push(currentSource);
    currentRotation = undefined;
  }

  return sources;
}

function normalizeSources(
  sources: DropSource[],
  metadata: ParseMetadata & { lastUpdated?: string }
): DropTableDataset {
  const sourceToDrops: Record<string, DropEntry[]> = {};
  const itemToSources: Record<string, FarmOption[]> = {};
  let dropCount = 0;

  for (const source of sources) {
    sourceToDrops[source.id] = source.drops;
    dropCount += source.drops.length;

    for (const drop of source.drops) {
      const key = drop.itemName.toLowerCase();
      const option: FarmOption = {
        sourceId: source.id,
        sourceName: source.name,
        category: source.category,
        ...drop
      };

      itemToSources[key] = [...(itemToSources[key] ?? []), option].sort(
        (left, right) =>
          right.chance - left.chance ||
          left.sourceName.localeCompare(right.sourceName) ||
          (left.rotation ?? "").localeCompare(right.rotation ?? "")
      );
    }
  }

  return {
    metadata: {
      sourceUrl: metadata.sourceUrl,
      scrapedAt: metadata.scrapedAt,
      lastUpdated: metadata.lastUpdated,
      sourceCount: sources.length,
      dropCount
    },
    sources,
    sourceToDrops,
    itemToSources
  };
}

function normalizeItemKey(value: string): string {
  return value.trim().toLowerCase();
}

function isIntactRelicSource(sourceName: string): boolean {
  return /\(Intact\)$/.test(sourceName);
}

function baseRelicName(sourceName: string): string {
  return sourceName.replace(/\s+\((Intact|Exceptional|Flawless|Radiant)\)$/, "");
}

function extractLines(html: string): string[] {
  const $ = cheerio.load(html);
  const bodyText = $("body").text() || $.root().text();

  return bodyText
    .split(/\r?\n/)
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function normalizeText(value: string): string {
  return value.replace(/\s+/g, " ").trim();
}

function parseHeadingCategory(line: string): string | undefined {
  const category = line.replace(/:$/, "").trim();

  if (!category || category === "Last Update" || category === "Disclaimer" || category === "Table of Contents") {
    return undefined;
  }

  return category;
}

function parseCategory(line: string): string | undefined {
  const match = line.match(/^#{0,6}\s*([^:]+):$/);
  const category = match?.[1]?.trim();

  if (!category || category === "Last Update" || category === "Disclaimer" || category === "Table of Contents") {
    return undefined;
  }

  return category;
}

function parseRotation(line: string): string | undefined {
  return line.match(/^Rotation\s+(.+)$/)?.[1]?.trim();
}

function parseDropLine(line: string, rotation: string | undefined): DropEntry | undefined {
  const match = line.match(dropLinePattern);
  if (!match) {
    return undefined;
  }

  return {
    itemName: match[1].trim(),
    rarity: match[2] as DropRarity,
    chance: Number(match[3]),
    ...(rotation ? { rotation } : {})
  };
}

function parseTableDrop(cells: string[], rotation: string | undefined): DropEntry | undefined {
  const itemName = cells.length >= 3 ? cells[1] : cells[0];
  const dropMeta = cells.length >= 3 ? cells[2] : cells[1];
  const match = dropMeta.match(dropMetaPattern);

  if (!itemName || !match) {
    return undefined;
  }

  return {
    itemName,
    rarity: match[1] as DropRarity,
    chance: Number(match[2]),
    ...(rotation ? { rotation } : {})
  };
}

function isStageHeader(line: string): boolean {
  return /^Stage\b/i.test(line) || /^Final stage$/i.test(line);
}

function isColumnHeader(line: string): boolean {
  return /^(Source|Reward|Item|Mod|Blueprint|Resource|Sigil)\b/i.test(line) && /Chance\b/i.test(line);
}

function shouldSkipCategory(category: string): boolean {
  return (
    category === "Mod Drops by Mod" ||
    category === "Blueprint/Part Drops by Item" ||
    category === "Resource Drops by Resource"
  );
}

function isIgnoredLine(line: string): boolean {
  return line.startsWith("Last Update:") || line === "That's right - Warframe is free!";
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function uniqueSourceId(baseId: string, sources: DropSource[]): string {
  const existing = new Set(sources.map((source) => source.id));
  let id = baseId || "source";
  let suffix = 2;

  while (existing.has(id)) {
    id = `${baseId}-${suffix}`;
    suffix += 1;
  }

  return id;
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

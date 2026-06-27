import { describe, expect, it } from "vitest";
import { compactMissionTableHtml, dropTableSampleHtml, primePartFarmSampleHtml } from "../test/dropTableSample";
import {
  buildWishlistRelicFarms,
  listPrimePartCandidates,
  parseDropTableHtml,
  rankDropSourcesForItem
} from "./dropTables";

describe("parseDropTableHtml", () => {
  it("parses source sections, rotations, rarities, and percentages", () => {
    const dataset = parseDropTableHtml(dropTableSampleHtml, {
      sourceUrl: "https://example.test/drop-tables.html",
      scrapedAt: "2026-06-27T18:00:00.000Z"
    });

    expect(dataset.metadata.lastUpdated).toBe("08 April, 2026");
    expect(dataset.sources).toHaveLength(3);
    expect(dataset.sourceToDrops["mercury-apollodorus-survival"]).toEqual([
      {
        itemName: "2,000 Credits Cache",
        rarity: "Common",
        chance: 50,
        rotation: "A"
      },
      {
        itemName: "100 Endo",
        rarity: "Common",
        chance: 50,
        rotation: "A"
      },
      {
        itemName: "Parry",
        rarity: "Rare",
        chance: 7.69,
        rotation: "B"
      },
      {
        itemName: "Steel Fiber",
        rarity: "Rare",
        chance: 7.69,
        rotation: "B"
      }
    ]);
  });

  it("builds an item-to-sources index for search and planning", () => {
    const dataset = parseDropTableHtml(dropTableSampleHtml, {
      sourceUrl: "https://example.test/drop-tables.html",
      scrapedAt: "2026-06-27T18:00:00.000Z"
    });

    expect(dataset.itemToSources["100 endo"]).toEqual([
      {
        sourceId: "mercury-apollodorus-survival",
        sourceName: "Mercury/Apollodorus (Survival)",
        category: "Missions",
        itemName: "100 Endo",
        rarity: "Common",
        chance: 50,
        rotation: "A"
      },
      {
        sourceId: "venus-beacon-shield-ring-caches",
        sourceName: "Venus/Beacon Shield Ring (Caches)",
        category: "Missions",
        itemName: "100 Endo",
        rarity: "Uncommon",
        chance: 26.09,
        rotation: "A"
      }
    ]);
  });

  it("preserves source boundaries when the official HTML table has no row line breaks", () => {
    const dataset = parseDropTableHtml(compactMissionTableHtml, {
      sourceUrl: "https://example.test/drop-tables.html",
      scrapedAt: "2026-06-27T18:00:00.000Z"
    });

    expect(dataset.sources.map((source) => source.name)).toEqual([
      "Mercury/Apollodorus (Survival)",
      "Mercury/Lares (Defense)"
    ]);
    expect(dataset.sourceToDrops["mercury-apollodorus-survival"]).toEqual([
      {
        itemName: "2,000 Credits Cache",
        rarity: "Common",
        chance: 50,
        rotation: "A"
      },
      {
        itemName: "100 Endo",
        rarity: "Common",
        chance: 50,
        rotation: "A"
      },
      {
        itemName: "Parry",
        rarity: "Rare",
        chance: 7.69,
        rotation: "B"
      }
    ]);
    expect(dataset.sourceToDrops["mercury-lares-defense"]).toEqual([
      {
        itemName: "Magazine Warp",
        rarity: "Rare",
        chance: 9.09,
        rotation: "A"
      },
      {
        itemName: "100 Endo",
        rarity: "Rare",
        chance: 7.69,
        rotation: "A"
      }
    ]);
  });
});

describe("rankDropSourcesForItem", () => {
  it("ranks farm options by drop chance first", () => {
    const dataset = parseDropTableHtml(dropTableSampleHtml, {
      sourceUrl: "https://example.test/drop-tables.html",
      scrapedAt: "2026-06-27T18:00:00.000Z"
    });

    const ranked = rankDropSourcesForItem(dataset, "100 Endo");

    expect(ranked.map((option) => option.sourceName)).toEqual([
      "Mercury/Apollodorus (Survival)",
      "Venus/Beacon Shield Ring (Caches)"
    ]);
  });
});

describe("listPrimePartCandidates", () => {
  it("lists unique prime parts from relic rewards", () => {
    const dataset = parseDropTableHtml(primePartFarmSampleHtml, {
      sourceUrl: "https://example.test/drop-tables.html",
      scrapedAt: "2026-06-27T18:00:00.000Z"
    });

    expect(listPrimePartCandidates(dataset)).toEqual([
      "Akbronco Prime Link",
      "Bronco Prime Barrel",
      "Paris Prime String"
    ]);
  });
});

describe("buildWishlistRelicFarms", () => {
  it("connects wished prime parts to relics and mission drops", () => {
    const dataset = parseDropTableHtml(primePartFarmSampleHtml, {
      sourceUrl: "https://example.test/drop-tables.html",
      scrapedAt: "2026-06-27T18:00:00.000Z"
    });

    const farms = buildWishlistRelicFarms(dataset, ["Akbronco Prime Link", "Paris Prime String"]);

    expect(farms).toEqual([
      {
        missionSourceId: "mars-spear-defense",
        missionName: "Mars/Spear (Defense)",
        relicName: "Lith Z9 Relic",
        relicDropRarity: "Common",
        relicDropChance: 33.33,
        rotation: "A",
        wishedParts: [
          {
            itemName: "Akbronco Prime Link",
            rarity: "Rare",
            chance: 2
          }
        ]
      },
      {
        missionSourceId: "venus-unda-spy",
        missionName: "Venus/Unda (Spy)",
        relicName: "Lith C14 Relic",
        relicDropRarity: "Common",
        relicDropChance: 20,
        rotation: "A",
        wishedParts: [
          {
            itemName: "Akbronco Prime Link",
            rarity: "Common",
            chance: 25.33
          },
          {
            itemName: "Paris Prime String",
            rarity: "Uncommon",
            chance: 11
          }
        ]
      },
      {
        missionSourceId: "earth-everest-excavation",
        missionName: "Earth/Everest (Excavation)",
        relicName: "Lith C14 Relic",
        relicDropRarity: "Rare",
        relicDropChance: 7.69,
        rotation: "B",
        wishedParts: [
          {
            itemName: "Akbronco Prime Link",
            rarity: "Common",
            chance: 25.33
          },
          {
            itemName: "Paris Prime String",
            rarity: "Uncommon",
            chance: 11
          }
        ]
      }
    ]);
  });

  it("excludes non-mission relic sources", () => {
    const dataset = parseDropTableHtml(primePartFarmSampleHtml, {
      sourceUrl: "https://example.test/drop-tables.html",
      scrapedAt: "2026-06-27T18:00:00.000Z"
    });

    const farms = buildWishlistRelicFarms(dataset, ["Akbronco Prime Link"]);

    expect(farms.map((farm) => farm.missionName)).not.toContain("Level 5 - 15 Cetus Bounty");
  });
});

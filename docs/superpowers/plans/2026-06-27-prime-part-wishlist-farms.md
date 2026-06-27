# Prime Part Wishlist Farms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persistent prime-part wishlist and a Relic Farms tab that shows missions dropping relics containing wished parts.

**Architecture:** Keep bundled drop data immutable and derive wishlist farms in `src/domain/dropTables.ts` from existing `Relics` and `Missions` sources. Store wishlist names in `localStorage` through a small React hook. `src/App.tsx` owns view state and renders three top-level views: item search, wishlist, and relic farms.

**Tech Stack:** React 19, TypeScript, Vite, Vitest, Testing Library, browser `localStorage`.

---

## File Structure

- Modify `src/test/dropTableSample.ts`: add a focused fixture with mission relic drops, a non-mission relic source, and relic reward tables.
- Modify `src/domain/dropTables.test.ts`: add behavior tests for prime part candidates and wishlist relic farm derivation.
- Modify `src/domain/dropTables.ts`: add `listPrimePartCandidates`, `buildWishlistRelicFarms`, and small exported result interfaces.
- Create `src/usePersistentWishlist.ts`: isolate browser wishlist persistence from drop-table repository caching.
- Create `src/usePersistentWishlist.test.tsx`: verify localStorage read, write, add, remove, and duplicate handling.
- Modify `src/App.test.tsx`: add integration tests for wishlist UI, persistence restore, relic farms, removal, and existing search.
- Modify `src/App.tsx`: add three view controls and render the new wishlist and relic farm experiences.
- Modify `src/styles.css`: add compact styles for tabs, wishlist controls, saved parts, and relic farm result tables.

## Task 1: Add Domain Tests For Wishlist Farm Derivation

**Files:**
- Modify: `src/test/dropTableSample.ts`
- Modify: `src/domain/dropTables.test.ts`

- [ ] **Step 1: Add the prime farming sample fixture**

Append this export to `src/test/dropTableSample.ts`:

```ts
export const primePartFarmSampleHtml = `
  <html>
    <body>
      <h3>Last Update: 08 April, 2026</h3>
      <h3>Missions:</h3>
      <p>Venus/Unda (Spy)</p>
      <p>Rotation A</p>
      <p>Lith C14 Relic Common (20.00%)</p>
      <p>Earth/Everest (Excavation)</p>
      <p>Rotation B</p>
      <p>Lith C14 Relic Rare (7.69%)</p>
      <p>Mars/Spear (Defense)</p>
      <p>Rotation A</p>
      <p>Lith Z9 Relic Common (33.33%)</p>
      <h3>Cetus Bounty Rewards:</h3>
      <p>Level 5 - 15 Cetus Bounty</p>
      <p>Stage 1</p>
      <p>Lith C14 Relic Common (20.00%)</p>
      <h3>Relics:</h3>
      <p>Lith C14 Relic (Intact)</p>
      <p>Akbronco Prime Link Common (25.33%)</p>
      <p>Paris Prime String Uncommon (11.00%)</p>
      <p>Forma Blueprint Rare (2.00%)</p>
      <p>Lith Z9 Relic (Intact)</p>
      <p>Akbronco Prime Link Rare (2.00%)</p>
      <p>Bronco Prime Barrel Common (25.33%)</p>
    </body>
  </html>
`;
```

- [ ] **Step 2: Write the failing domain tests**

Change the import in `src/domain/dropTables.test.ts` from:

```ts
import { compactMissionTableHtml, dropTableSampleHtml } from "../test/dropTableSample";
import { parseDropTableHtml, rankDropSourcesForItem } from "./dropTables";
```

to:

```ts
import { compactMissionTableHtml, dropTableSampleHtml, primePartFarmSampleHtml } from "../test/dropTableSample";
import {
  buildWishlistRelicFarms,
  listPrimePartCandidates,
  parseDropTableHtml,
  rankDropSourcesForItem
} from "./dropTables";
```

Append this block to `src/domain/dropTables.test.ts`:

```ts
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
```

- [ ] **Step 3: Run the domain test and verify it fails**

Run:

```bash
npm test -- src/domain/dropTables.test.ts
```

Expected: FAIL because `buildWishlistRelicFarms` and `listPrimePartCandidates` are not exported from `src/domain/dropTables.ts`.

## Task 2: Implement Domain Derivation Helpers

**Files:**
- Modify: `src/domain/dropTables.ts`
- Test: `src/domain/dropTables.test.ts`

- [ ] **Step 1: Add exported wishlist farm interfaces**

Insert these interfaces after `export interface FarmOption extends DropEntry` in `src/domain/dropTables.ts`:

```ts
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
```

- [ ] **Step 2: Add the prime candidate and relic farm functions**

Insert this code after `rankDropSourcesForItem` in `src/domain/dropTables.ts`:

```ts
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
```

- [ ] **Step 3: Add helper functions**

Insert this code before `extractLines` in `src/domain/dropTables.ts`:

```ts
function normalizeItemKey(value: string): string {
  return value.trim().toLowerCase();
}

function isIntactRelicSource(sourceName: string): boolean {
  return /\(Intact\)$/.test(sourceName);
}

function baseRelicName(sourceName: string): string {
  return sourceName.replace(/\s+\((Intact|Exceptional|Flawless|Radiant)\)$/, "");
}
```

- [ ] **Step 4: Run the domain test and verify it passes**

Run:

```bash
npm test -- src/domain/dropTables.test.ts
```

Expected: PASS for all tests in `src/domain/dropTables.test.ts`.

- [ ] **Step 5: Commit the domain change**

Run:

```bash
git add src/test/dropTableSample.ts src/domain/dropTables.test.ts src/domain/dropTables.ts
git commit -m "Add prime wishlist relic farm derivation"
```

## Task 3: Add Persistent Wishlist Hook

**Files:**
- Create: `src/usePersistentWishlist.ts`
- Create: `src/usePersistentWishlist.test.tsx`

- [ ] **Step 1: Write the failing hook tests**

Create `src/usePersistentWishlist.test.tsx` with this content:

```tsx
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PRIME_PART_WISHLIST_STORAGE_KEY, usePersistentWishlist } from "./usePersistentWishlist";

function WishlistHarness({ storageKey = PRIME_PART_WISHLIST_STORAGE_KEY }: { storageKey?: string }) {
  const { wishlist, addToWishlist, removeFromWishlist } = usePersistentWishlist(storageKey);

  return (
    <section>
      <p data-testid="wishlist-value">{wishlist.length > 0 ? wishlist.join("|") : "empty"}</p>
      <button onClick={() => addToWishlist("Akbronco Prime Link")} type="button">
        Add Akbronco
      </button>
      <button onClick={() => addToWishlist(" akbronco prime link ")} type="button">
        Add Duplicate
      </button>
      <button onClick={() => removeFromWishlist("Akbronco Prime Link")} type="button">
        Remove Akbronco
      </button>
    </section>
  );
}

describe("usePersistentWishlist", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads the wishlist from localStorage", () => {
    localStorage.setItem(PRIME_PART_WISHLIST_STORAGE_KEY, JSON.stringify(["Paris Prime String"]));

    render(<WishlistHarness />);

    expect(screen.getByTestId("wishlist-value")).toHaveTextContent("Paris Prime String");
  });

  it("adds, deduplicates, removes, and persists wishlist entries", async () => {
    const user = userEvent.setup();
    render(<WishlistHarness />);

    await user.click(screen.getByRole("button", { name: "Add Akbronco" }));
    await user.click(screen.getByRole("button", { name: "Add Duplicate" }));

    expect(screen.getByTestId("wishlist-value")).toHaveTextContent("Akbronco Prime Link");
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(PRIME_PART_WISHLIST_STORAGE_KEY) ?? "[]")).toEqual([
        "Akbronco Prime Link"
      ]);
    });

    await user.click(screen.getByRole("button", { name: "Remove Akbronco" }));

    expect(screen.getByTestId("wishlist-value")).toHaveTextContent("empty");
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(PRIME_PART_WISHLIST_STORAGE_KEY) ?? "[]")).toEqual([]);
    });
  });
});
```

- [ ] **Step 2: Run the hook test and verify it fails**

Run:

```bash
npm test -- src/usePersistentWishlist.test.tsx
```

Expected: FAIL because `src/usePersistentWishlist.ts` does not exist.

- [ ] **Step 3: Implement the hook**

Create `src/usePersistentWishlist.ts` with this content:

```ts
import { useEffect, useState } from "react";

export const PRIME_PART_WISHLIST_STORAGE_KEY = "wf-tracker:prime-part-wishlist:v1";

export interface PersistentWishlist {
  wishlist: string[];
  addToWishlist(itemName: string): void;
  removeFromWishlist(itemName: string): void;
}

export function usePersistentWishlist(storageKey = PRIME_PART_WISHLIST_STORAGE_KEY): PersistentWishlist {
  const [wishlist, setWishlist] = useState<string[]>(() => readStoredWishlist(storageKey));

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(wishlist));
  }, [storageKey, wishlist]);

  function addToWishlist(itemName: string) {
    const canonicalName = itemName.trim();
    if (!canonicalName) {
      return;
    }

    setWishlist((currentWishlist) => {
      if (currentWishlist.some((currentName) => currentName.toLowerCase() === canonicalName.toLowerCase())) {
        return currentWishlist;
      }

      return [...currentWishlist, canonicalName].sort((left, right) => left.localeCompare(right));
    });
  }

  function removeFromWishlist(itemName: string) {
    const itemKey = itemName.trim().toLowerCase();
    setWishlist((currentWishlist) => currentWishlist.filter((currentName) => currentName.toLowerCase() !== itemKey));
  }

  return {
    wishlist,
    addToWishlist,
    removeFromWishlist
  };
}

function readStoredWishlist(storageKey: string): string[] {
  const storedWishlist = localStorage.getItem(storageKey);
  if (!storedWishlist) {
    return [];
  }

  try {
    const parsedWishlist = JSON.parse(storedWishlist);
    if (!Array.isArray(parsedWishlist)) {
      return [];
    }

    return parsedWishlist.filter((itemName): itemName is string => typeof itemName === "string" && itemName.trim());
  } catch {
    return [];
  }
}
```

- [ ] **Step 4: Run the hook test and verify it passes**

Run:

```bash
npm test -- src/usePersistentWishlist.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit the hook**

Run:

```bash
git add src/usePersistentWishlist.ts src/usePersistentWishlist.test.tsx
git commit -m "Persist prime part wishlist locally"
```

## Task 4: Add App-Level Wishlist And Relic Farm Tests

**Files:**
- Modify: `src/App.test.tsx`

- [ ] **Step 1: Update imports and test setup**

Change the imports at the top of `src/App.test.tsx` to include `beforeEach`, the new fixture, and the storage key:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createDropTableRepository, type DropTableStorage } from "./data/dropTableRepository";
import { parseDropTableHtml, type DropTableDataset } from "./domain/dropTables";
import { dropTableSampleHtml, primePartFarmSampleHtml } from "./test/dropTableSample";
import { PRIME_PART_WISHLIST_STORAGE_KEY } from "./usePersistentWishlist";
import { FarmPlannerApp } from "./App";
```

Add this setup block inside the `describe("FarmPlannerApp", () => {` block before the first test:

```tsx
  beforeEach(() => {
    localStorage.clear();
  });
```

- [ ] **Step 2: Add integration tests for wishlist and relic farms**

Append these tests inside `describe("FarmPlannerApp", () => {`:

```tsx
  it("adds a prime part to the wishlist and shows missions for matching relics", async () => {
    const user = userEvent.setup();
    render(<FarmPlannerApp repository={createRepository(primePartFarmSampleHtml)} />);

    await user.click(await screen.findByRole("button", { name: "Wishlist" }));
    await user.type(screen.getByLabelText("Search prime part"), "Akbronco");
    await user.click(await screen.findByRole("button", { name: "Add Akbronco Prime Link" }));

    expect(screen.getByRole("list", { name: "Wishlist parts" })).toHaveTextContent("Akbronco Prime Link");

    await user.click(screen.getByRole("button", { name: "Relic Farms" }));

    const results = await screen.findAllByRole("article");
    expect(results[0]).toHaveTextContent("Mars/Spear (Defense)");
    expect(within(results[0]).getByRole("row", { name: "Lith Z9 Relic Common 33.33% Akbronco Prime Link Rare 2.00%" })).toBeInTheDocument();
    expect(screen.queryByText("Level 5 - 15 Cetus Bounty")).not.toBeInTheDocument();
  });

  it("restores the wishlist from localStorage", async () => {
    localStorage.setItem(PRIME_PART_WISHLIST_STORAGE_KEY, JSON.stringify(["Akbronco Prime Link"]));
    const user = userEvent.setup();
    render(<FarmPlannerApp repository={createRepository(primePartFarmSampleHtml)} />);

    await user.click(await screen.findByRole("button", { name: "Wishlist" }));

    expect(screen.getByRole("list", { name: "Wishlist parts" })).toHaveTextContent("Akbronco Prime Link");

    await user.click(screen.getByRole("button", { name: "Relic Farms" }));

    expect(await screen.findByText("Mars/Spear (Defense)")).toBeInTheDocument();
  });

  it("removes a prime part from the wishlist and clears relic farms", async () => {
    localStorage.setItem(PRIME_PART_WISHLIST_STORAGE_KEY, JSON.stringify(["Akbronco Prime Link"]));
    const user = userEvent.setup();
    render(<FarmPlannerApp repository={createRepository(primePartFarmSampleHtml)} />);

    await user.click(await screen.findByRole("button", { name: "Wishlist" }));
    await user.click(screen.getByRole("button", { name: "Remove Akbronco Prime Link" }));
    await user.click(screen.getByRole("button", { name: "Relic Farms" }));

    expect(screen.getByText("Add prime parts to your wishlist to see relic farm missions.")).toBeInTheDocument();
  });
```

- [ ] **Step 3: Change the repository helper to accept fixture HTML**

Replace the existing `createRepository` helper in `src/App.test.tsx` with this:

```tsx
function createRepository(html = dropTableSampleHtml) {
  const bundled = createDataset("2026-06-27T18:00:00.000Z", html);
  return createDropTableRepository(createMemoryStorage(), bundled);
}
```

Replace the existing `createDataset` helper in `src/App.test.tsx` with this:

```tsx
function createDataset(scrapedAt: string, html = dropTableSampleHtml): DropTableDataset {
  return parseDropTableHtml(html, {
    sourceUrl: "https://example.test/drop-tables.html",
    scrapedAt
  });
}
```

- [ ] **Step 4: Run the app test and verify it fails**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: FAIL because `FarmPlannerApp` does not render `Wishlist`, `Relic Farms`, prime-part search, or wishlist farm results.

## Task 5: Implement App Views

**Files:**
- Modify: `src/App.tsx`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Update imports and view types**

Change the domain import in `src/App.tsx` to:

```tsx
import {
  buildWishlistRelicFarms,
  listPrimePartCandidates,
  rankDropSourcesForItem,
  type DropEntry,
  type DropSource,
  type DropTableDataset,
  type FarmOption,
  type WishlistRelicFarm
} from "./domain/dropTables";
```

Add this import after the domain import:

```tsx
import { usePersistentWishlist } from "./usePersistentWishlist";
```

Add this type near the component props:

```tsx
type PlannerView = "search" | "wishlist" | "farms";
```

- [ ] **Step 2: Add view state and derived wishlist data**

Inside `FarmPlannerApp`, after the existing state declarations, add:

```tsx
  const [activeView, setActiveView] = useState<PlannerView>("search");
  const [primePartQuery, setPrimePartQuery] = useState("");
  const { wishlist, addToWishlist, removeFromWishlist } = usePersistentWishlist();
```

After the existing `missionDropTables` memo, add:

```tsx
  const primePartCandidates = useMemo(() => (dataset ? listPrimePartCandidates(dataset) : []), [dataset]);
  const primePartCandidateByKey = useMemo(
    () => new Map(primePartCandidates.map((itemName) => [itemName.toLowerCase(), itemName])),
    [primePartCandidates]
  );
  const visibleWishlist = useMemo(
    () =>
      wishlist
        .map((itemName) => primePartCandidateByKey.get(itemName.toLowerCase()))
        .filter((itemName): itemName is string => Boolean(itemName)),
    [primePartCandidateByKey, wishlist]
  );
  const visibleWishlistKeys = useMemo(
    () => new Set(visibleWishlist.map((itemName) => itemName.toLowerCase())),
    [visibleWishlist]
  );
  const matchingPrimeParts = useMemo(() => {
    const trimmedPrimePartQuery = primePartQuery.trim().toLowerCase();
    if (trimmedPrimePartQuery.length < 2) {
      return [];
    }

    return primePartCandidates
      .filter(
        (itemName) =>
          itemName.toLowerCase().includes(trimmedPrimePartQuery) && !visibleWishlistKeys.has(itemName.toLowerCase())
      )
      .slice(0, 8);
  }, [primePartCandidates, primePartQuery, visibleWishlistKeys]);
  const wishlistRelicFarms = useMemo(
    () => (dataset ? buildWishlistRelicFarms(dataset, visibleWishlist) : []),
    [dataset, visibleWishlist]
  );
```

- [ ] **Step 3: Replace the loaded-state body after the header**

In the loaded-state `return`, replace everything after the closing `</header>` and before the closing `</main>` with this JSX:

```tsx
      <nav className="view-tabs" aria-label="Planner views">
        <button
          className={activeView === "search" ? "active" : undefined}
          onClick={() => setActiveView("search")}
          type="button"
        >
          Item Search
        </button>
        <button
          className={activeView === "wishlist" ? "active" : undefined}
          onClick={() => setActiveView("wishlist")}
          type="button"
        >
          Wishlist
        </button>
        <button
          className={activeView === "farms" ? "active" : undefined}
          onClick={() => setActiveView("farms")}
          type="button"
        >
          Relic Farms
        </button>
      </nav>

      {activeView === "search" ? (
        <>
          <section className="planner-tools" aria-label="Planner controls">
            <label className="search-field">
              <span>Search item</span>
              <input
                aria-label="Search item"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Try 100 Endo, Parry, Akbronco Prime Link"
                type="search"
              />
            </label>
            <button className="secondary-action" disabled={isResetting} onClick={resetLocalCache} type="button">
              {isResetting ? "Resetting..." : "Reset local cache"}
            </button>
          </section>

          {trimmedQuery && farmOptions.length === 0 ? (
            <section className="empty-state">
              <h2>No drop sources found for {trimmedQuery}.</h2>
              {matchingItems.length > 0 ? (
                <div className="suggestions" aria-label="Matching item suggestions">
                  {matchingItems.map((itemName) => (
                    <button key={itemName} onClick={() => setQuery(titleCase(itemName))} type="button">
                      {titleCase(itemName)}
                    </button>
                  ))}
                </div>
              ) : null}
            </section>
          ) : null}

          {!trimmedQuery ? (
            <section className="empty-state">
              <h2>Search for an item to rank its farm sources.</h2>
            </section>
          ) : null}

          {missionDropTables.length > 0 ? (
            <section className="results-stack" aria-label={`Farm options for ${trimmedQuery}`}>
              {missionDropTables.map((missionDropTable) => (
                <MissionDropTableCard
                  key={missionDropTable.source.id}
                  missionDropTable={missionDropTable}
                  searchedItem={trimmedQuery}
                />
              ))}
            </section>
          ) : null}
        </>
      ) : null}

      {activeView === "wishlist" ? (
        <WishlistView
          matchingPrimeParts={matchingPrimeParts}
          onAddPart={addToWishlist}
          onPrimePartQueryChange={setPrimePartQuery}
          onRemovePart={removeFromWishlist}
          primePartQuery={primePartQuery}
          wishlist={visibleWishlist}
        />
      ) : null}

      {activeView === "farms" ? (
        <RelicFarmsView relicFarms={wishlistRelicFarms} wishlist={visibleWishlist} />
      ) : null}
```

- [ ] **Step 4: Add WishlistView**

Insert this component after `MissionDropTableCard`:

```tsx
function WishlistView({
  matchingPrimeParts,
  onAddPart,
  onPrimePartQueryChange,
  onRemovePart,
  primePartQuery,
  wishlist
}: {
  matchingPrimeParts: string[];
  onAddPart(itemName: string): void;
  onPrimePartQueryChange(value: string): void;
  onRemovePart(itemName: string): void;
  primePartQuery: string;
  wishlist: string[];
}) {
  return (
    <section className="wishlist-layout" aria-label="Prime part wishlist">
      <div className="wishlist-panel">
        <label className="search-field">
          <span>Search prime part</span>
          <input
            aria-label="Search prime part"
            onChange={(event) => onPrimePartQueryChange(event.target.value)}
            placeholder="Try Akbronco Prime Link"
            type="search"
            value={primePartQuery}
          />
        </label>
        {primePartQuery.trim().length >= 2 ? (
          matchingPrimeParts.length > 0 ? (
            <div className="suggestions" aria-label="Matching prime part suggestions">
              {matchingPrimeParts.map((itemName) => (
                <button key={itemName} onClick={() => onAddPart(itemName)} type="button">
                  Add {itemName}
                </button>
              ))}
            </div>
          ) : (
            <p className="muted-copy">No unwishlisted prime parts match that search.</p>
          )
        ) : (
          <p className="muted-copy">Search relic rewards to add prime parts.</p>
        )}
      </div>

      <div className="wishlist-panel">
        <h2>Wishlist</h2>
        {wishlist.length > 0 ? (
          <ul className="wishlist-list" aria-label="Wishlist parts">
            {wishlist.map((itemName) => (
              <li key={itemName}>
                <span>{itemName}</span>
                <button onClick={() => onRemovePart(itemName)} type="button">
                  Remove {itemName}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-copy">No prime parts saved yet.</p>
        )}
      </div>
    </section>
  );
}
```

- [ ] **Step 5: Add RelicFarmsView**

Insert this component after `WishlistView`:

```tsx
function RelicFarmsView({
  relicFarms,
  wishlist
}: {
  relicFarms: WishlistRelicFarm[];
  wishlist: string[];
}) {
  if (wishlist.length === 0) {
    return (
      <section className="empty-state">
        <h2>Add prime parts to your wishlist to see relic farm missions.</h2>
      </section>
    );
  }

  if (relicFarms.length === 0) {
    return (
      <section className="empty-state">
        <h2>No mission relic farms found for your wishlist.</h2>
      </section>
    );
  }

  return (
    <section className="results-stack" aria-label="Relic farm missions">
      {relicFarms.map((farm) => (
        <article
          className="mission-card"
          key={`${farm.missionSourceId}-${farm.rotation ?? "base"}-${farm.relicName}`}
        >
          <div className="mission-card-header">
            <p className="category">{farm.rotation ? `Rotation ${farm.rotation}` : "Mission relic farm"}</p>
            <h2>{farm.missionName}</h2>
          </div>
          <div className="table-scroll">
            <table className="drop-table relic-farm-table">
              <thead>
                <tr>
                  <th scope="col">Relic</th>
                  <th scope="col">Relic Rarity</th>
                  <th scope="col">Mission Chance</th>
                  <th scope="col">Wishlist Part</th>
                  <th scope="col">Part Rarity</th>
                  <th scope="col">Relic Chance</th>
                </tr>
              </thead>
              <tbody>
                {farm.wishedParts.map((part) => (
                  <tr key={`${farm.relicName}-${part.itemName}`}>
                    <td>{farm.relicName}</td>
                    <td>{farm.relicDropRarity}</td>
                    <td>{farm.relicDropChance.toFixed(2)}%</td>
                    <td>{part.itemName}</td>
                    <td>{part.rarity}</td>
                    <td>{part.chance.toFixed(2)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </article>
      ))}
    </section>
  );
}
```

- [ ] **Step 6: Run the app test and verify it passes**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit the app views**

Run:

```bash
git add src/App.tsx src/App.test.tsx
git commit -m "Add prime part wishlist farm views"
```

## Task 6: Style The New Views

**Files:**
- Modify: `src/styles.css`
- Test: `src/App.test.tsx`

- [ ] **Step 1: Add styles for tabs, wishlist, and farm tables**

Insert this CSS after `.planner-tools`:

```css
.view-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding: 22px 0 0;
}

.view-tabs button {
  min-height: 42px;
  border: 1px solid rgba(246, 241, 232, 0.18);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.06);
  color: #f6f1e8;
  padding: 0 14px;
  font-weight: 800;
}

.view-tabs button.active {
  border-color: rgba(223, 189, 104, 0.75);
  background: #dfbd68;
  color: #1b1710;
}
```

Insert this CSS after `.suggestions`:

```css
.wishlist-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 0.45fr);
  gap: 22px;
  padding-top: 28px;
}

.wishlist-panel {
  border: 1px solid rgba(246, 241, 232, 0.14);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.07);
  padding: 22px;
}

.wishlist-panel h2 {
  margin-bottom: 16px;
}

.muted-copy {
  margin: 16px 0 0;
  color: #b8ad9d;
  line-height: 1.55;
}

.wishlist-list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.wishlist-list li {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 12px;
  align-items: center;
  border: 1px solid rgba(246, 241, 232, 0.13);
  border-radius: 8px;
  background: rgba(16, 16, 15, 0.42);
  padding: 12px;
}

.wishlist-list span {
  min-width: 0;
  color: #fff9ee;
  font-weight: 800;
}

.wishlist-list button {
  min-height: 36px;
  border: 1px solid rgba(139, 214, 199, 0.45);
  border-radius: 8px;
  background: rgba(139, 214, 199, 0.15);
  color: #f6f1e8;
  padding: 0 12px;
  font-weight: 800;
}

.relic-farm-table {
  min-width: 780px;
}
```

Add this rule inside the existing `@media (max-width: 760px)` block:

```css
  .wishlist-layout {
    grid-template-columns: 1fr;
  }

  .wishlist-list li {
    grid-template-columns: 1fr;
  }
```

- [ ] **Step 2: Run the app tests after CSS changes**

Run:

```bash
npm test -- src/App.test.tsx
```

Expected: PASS.

- [ ] **Step 3: Commit the CSS**

Run:

```bash
git add src/styles.css
git commit -m "Style prime wishlist farm views"
```

## Task 7: Full Verification

**Files:**
- Check: all modified files

- [ ] **Step 1: Run all tests**

Run:

```bash
npm test
```

Expected: PASS for all Vitest suites.

- [ ] **Step 2: Run the production build**

Run:

```bash
npm run build
```

Expected: TypeScript build and Vite build complete successfully.

- [ ] **Step 3: Review git status**

Run:

```bash
git status --short
```

Expected: no unstaged implementation changes from this feature. Pre-existing untracked project files may still be visible because this repository started with only the design document committed.

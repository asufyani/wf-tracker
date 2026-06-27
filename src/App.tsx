import { useEffect, useMemo, useState } from "react";
import type { DropTableRepository } from "./data/dropTableRepository";
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
import { usePersistentWishlist } from "./usePersistentWishlist";
import "./styles.css";

interface FarmPlannerAppProps {
  repository: DropTableRepository;
}

type PlannerView = "search" | "wishlist" | "farms";

interface MissionDropTable {
  source: DropSource;
  rotationGroups: RotationDropGroup[];
}

interface RotationDropGroup {
  rotation: string;
  drops: DropEntry[];
}

export function FarmPlannerApp({ repository }: FarmPlannerAppProps) {
  const [dataset, setDataset] = useState<DropTableDataset>();
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string>();
  const [isResetting, setIsResetting] = useState(false);
  const [activeView, setActiveView] = useState<PlannerView>("search");
  const [primePartQuery, setPrimePartQuery] = useState("");
  const { wishlist, addToWishlist, removeFromWishlist } = usePersistentWishlist();

  useEffect(() => {
    let isMounted = true;

    repository
      .loadDataset()
      .then((loadedDataset) => {
        if (isMounted) {
          setDataset(loadedDataset);
        }
      })
      .catch(() => {
        if (isMounted) {
          setError("Drop table data could not be loaded.");
        }
      });

    return () => {
      isMounted = false;
    };
  }, [repository]);

  const trimmedQuery = query.trim();
  const matchingItems = useMemo(() => {
    if (!dataset || trimmedQuery.length < 2) {
      return [];
    }

    return Object.keys(dataset.itemToSources)
      .filter((itemName) => itemName.includes(trimmedQuery.toLowerCase()))
      .slice(0, 8);
  }, [dataset, trimmedQuery]);

  const farmOptions = useMemo(() => {
    if (!dataset || !trimmedQuery) {
      return [];
    }

    return rankDropSourcesForItem(dataset, trimmedQuery);
  }, [dataset, trimmedQuery]);

  const missionDropTables = useMemo(() => {
    if (!dataset || farmOptions.length === 0) {
      return [];
    }

    return buildMissionDropTables(dataset, farmOptions);
  }, [dataset, farmOptions]);
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

  async function resetLocalCache() {
    setIsResetting(true);
    setError(undefined);

    try {
      setDataset(await repository.resetToBundledDataset());
    } catch {
      setError("Local cache could not be reset.");
    } finally {
      setIsResetting(false);
    }
  }

  if (error) {
    return (
      <main className="app-shell">
        <section className="status-panel" role="alert">
          <h1>Warframe Farm Planner</h1>
          <p>{error}</p>
        </section>
      </main>
    );
  }

  if (!dataset) {
    return (
      <main className="app-shell">
        <section className="status-panel">
          <h1>Warframe Farm Planner</h1>
          <p>Loading drop tables...</p>
        </section>
      </main>
    );
  }

  return (
    <main className="app-shell">
      <header className="planner-header">
        <div>
          <p className="eyebrow">Static drop-table planner</p>
          <h1>Warframe Farm Planner</h1>
          <p className="lede">Search an item to compare known drop sources by chance, rotation, and rarity.</p>
          <p className="scrape-stamp">Scraped {formatDate(dataset.metadata.scrapedAt)}</p>
        </div>
        <dl className="metadata-strip" aria-label="Drop table metadata">
          <div>
            <dt>Sources</dt>
            <dd>{dataset.metadata.sourceCount.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Drops</dt>
            <dd>{dataset.metadata.dropCount.toLocaleString()}</dd>
          </div>
          <div>
            <dt>Scraped</dt>
            <dd>{formatDate(dataset.metadata.scrapedAt)}</dd>
          </div>
        </dl>
      </header>

      <nav className="view-tabs" aria-label="Planner views">
        <button
          aria-current={activeView === "search" ? "page" : undefined}
          className={activeView === "search" ? "active" : undefined}
          onClick={() => setActiveView("search")}
          type="button"
        >
          Item Search
        </button>
        <button
          aria-current={activeView === "wishlist" ? "page" : undefined}
          className={activeView === "wishlist" ? "active" : undefined}
          onClick={() => setActiveView("wishlist")}
          type="button"
        >
          Wishlist
        </button>
        <button
          aria-current={activeView === "farms" ? "page" : undefined}
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
    </main>
  );
}

function MissionDropTableCard({
  missionDropTable,
  searchedItem
}: {
  missionDropTable: MissionDropTable;
  searchedItem: string;
}) {
  return (
    <article className="mission-card">
      <div className="mission-card-header">
        <p className="category">{missionDropTable.source.category}</p>
        <h2>{missionDropTable.source.name}</h2>
      </div>
      <div className="rotation-stack">
        {missionDropTable.rotationGroups.map((group) => (
          <section key={group.rotation} className="rotation-section" aria-label={`Rotation ${group.rotation} drops`}>
            <h3>{group.rotation === "Base" ? "Base Drops" : `Rotation ${group.rotation}`}</h3>
            <div className="table-scroll">
              <table className="drop-table">
                <thead>
                  <tr>
                    <th scope="col">Reward</th>
                    <th scope="col">Rarity</th>
                    <th scope="col">Chance</th>
                  </tr>
                </thead>
                <tbody>
                  {group.drops.map((drop, dropIndex) => (
                    <tr
                      className={drop.itemName.toLowerCase() === searchedItem.toLowerCase() ? "matching-drop" : undefined}
                      key={`${group.rotation}-${dropIndex}-${drop.itemName}-${drop.rarity}-${drop.chance}`}
                    >
                      <td>{drop.itemName}</td>
                      <td>{drop.rarity}</td>
                      <td>{drop.chance.toFixed(2)}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        ))}
      </div>
    </article>
  );
}

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
      {relicFarms.map((farm, farmIndex) => (
        <article
          className="mission-card"
          key={`${farm.missionSourceId}-${farm.rotation ?? "base"}-${farm.relicName}-${farmIndex}`}
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

function buildMissionDropTables(dataset: DropTableDataset, farmOptions: FarmOption[]): MissionDropTable[] {
  const sourceById = new Map(dataset.sources.map((source) => [source.id, source]));
  const seenSourceIds = new Set<string>();
  const missionDropTables: MissionDropTable[] = [];

  for (const option of farmOptions) {
    if (seenSourceIds.has(option.sourceId)) {
      continue;
    }

    const source = sourceById.get(option.sourceId);
    if (!source) {
      continue;
    }

    missionDropTables.push({
      source,
      rotationGroups: groupDropsByRotation(source.drops)
    });
    seenSourceIds.add(option.sourceId);
  }

  return missionDropTables;
}

function groupDropsByRotation(drops: DropEntry[]): RotationDropGroup[] {
  const groups = new Map<string, DropEntry[]>();

  for (const drop of drops) {
    const rotation = drop.rotation ?? "Base";
    groups.set(rotation, [...(groups.get(rotation) ?? []), drop]);
  }

  return [...groups.entries()]
    .sort(([leftRotation], [rightRotation]) => rotationSortValue(leftRotation) - rotationSortValue(rightRotation))
    .map(([rotation, rotationDrops]) => ({
      rotation,
      drops: rotationDrops
    }));
}

function rotationSortValue(rotation: string): number {
  if (rotation === "Base") {
    return 999;
  }

  const normalized = rotation.toUpperCase();
  if (/^[A-Z]$/.test(normalized)) {
    return normalized.charCodeAt(0) - 64;
  }

  return 500;
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC"
  }).format(new Date(value));
}

function titleCase(value: string): string {
  return value.replace(/\b\w/g, (letter) => letter.toUpperCase());
}

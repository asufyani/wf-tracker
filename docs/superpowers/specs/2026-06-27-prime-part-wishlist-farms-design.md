# Prime Part Wishlist Farms Design

## Context

The app currently loads a bundled Warframe drop-table dataset, indexes drops by item name, and lets the user search one item to compare direct drop sources. The dataset already contains both relic reward tables and mission reward tables:

- Relic sources have `category: "Relics"` and contain prime parts as drops.
- Mission sources have `category: "Missions"` and can contain relics as drops.

This feature should focus the app on farming prime parts by adding a persistent wishlist and a farm tab that connects wished prime parts to relics, then connects those relics to missions.

## Assumptions

- "Prime parts" means relic reward drops whose item name includes `Prime`.
- "Missions" means the official drop-table `Missions` category only. Bounties and other relic reward categories are out of scope for the first version.
- Wishlist state is user-specific browser state and should persist in `localStorage`.
- Resetting the drop-table cache should not erase the wishlist.

## User Experience

The app will have three top-level views:

- `Item Search`: keep the existing direct item search and mission/reward table results.
- `Wishlist`: search prime parts from relic reward data, add parts, view selected parts, and remove parts.
- `Relic Farms`: show missions that drop relics containing at least one wished part.

When the wishlist is empty, the farm tab should show a short empty state that tells the user to add prime parts first. When wished parts have no mission-sourced relics, the farm tab should show a no-results state rather than failing silently.

## Data Model

No bundled JSON schema change is required. Runtime code can derive the needed relationships from `DropTableDataset`.

Derived structures:

- Prime part candidates: all drops from `Relics` sources whose `itemName` contains `Prime`.
- Relics for wishlist parts: relic sources in `Relics` that drop one or more wished parts.
- Mission farm options: mission sources in `Missions` that drop one or more of those relic names.

Wishlist persistence:

- Store an array of canonical prime part names in browser storage.
- Use the storage key `wf-tracker:prime-part-wishlist:v1`.
- Normalize lookups by lower-casing names, but display the original item names from the dataset.
- Ignore stored names that no longer exist in the current bundled dataset.

## Ranking

Farm options should be sorted for practical scanning:

1. Higher mission relic drop chance first.
2. Mission name alphabetically.
3. Rotation alphabetically when needed.
4. Relic name alphabetically when needed.

Each mission result should show:

- Mission name.
- Rotation, if present.
- Relic name.
- Relic drop chance from that mission.
- Wished prime part or parts available from that relic, including the relic reward chance.

## Implementation Shape

Add domain helpers in or near `src/domain/dropTables.ts` for the derived farm logic. Keep persistence separate from drop-table cache logic so the wishlist does not couple to dataset refresh behavior.

Units:

- `listPrimePartCandidates(dataset)`: returns sorted unique prime part names.
- `buildWishlistRelicFarms(dataset, wishlistPartNames)`: returns ranked mission-to-relic farm options.
- `usePersistentWishlist(storageKey)`: small React hook owned by the app layer and backed by `localStorage`.

The app component can then wire those helpers into tabs and render the new list without changing the data refresh scripts.

## Testing

Use test-first implementation.

Domain tests:

- Prime part candidate listing includes relic prime drops and excludes non-prime drops.
- Wishlist farm building connects a wished prime part to its relic and to missions that drop that relic.
- Farm ranking prefers higher mission relic drop chances.
- Non-mission relic sources are excluded in this first version.

App tests:

- A user can add a prime part to the wishlist.
- The wishlist is written to browser storage and restored on render.
- The farm tab shows missions that drop relics for the wished part.
- Removing a wished part updates the farm tab.
- Existing direct item search behavior still works.

## Out Of Scope

- Account sync or server persistence.
- Tracking owned parts, relic inventory, vaulted status, refinement strategy, or expected-value math.
- Including bounties, packs, syndicates, or other non-`Missions` relic sources.
- Changing the drop-table scraper output schema.

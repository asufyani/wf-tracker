import { get, set } from "idb-keyval";
import type { DropTableDataset } from "../domain/dropTables";

const DROP_TABLE_CACHE_KEY = "wf-tracker:drop-tables:v1";

export interface DropTableStorage {
  get(): Promise<DropTableDataset | undefined>;
  set(dataset: DropTableDataset): Promise<void>;
}

export interface DropTableRepository {
  loadDataset(): Promise<DropTableDataset>;
  resetToBundledDataset(): Promise<DropTableDataset>;
}

export function createDropTableRepository(
  storage: DropTableStorage,
  bundledDataset: DropTableDataset
): DropTableRepository {
  return {
    async loadDataset() {
      const cachedDataset = await storage.get();
      if (cachedDataset) {
        if (isBundledDatasetNewer(cachedDataset, bundledDataset)) {
          await storage.set(bundledDataset);
          return bundledDataset;
        }

        return cachedDataset;
      }

      await storage.set(bundledDataset);
      return bundledDataset;
    },

    async resetToBundledDataset() {
      await storage.set(bundledDataset);
      return bundledDataset;
    }
  };
}

function isBundledDatasetNewer(cachedDataset: DropTableDataset, bundledDataset: DropTableDataset): boolean {
  const cachedScrapedAt = Date.parse(cachedDataset.metadata.scrapedAt);
  const bundledScrapedAt = Date.parse(bundledDataset.metadata.scrapedAt);

  return (
    bundledScrapedAt > cachedScrapedAt ||
    cachedDataset.metadata.sourceCount !== bundledDataset.metadata.sourceCount ||
    cachedDataset.metadata.dropCount !== bundledDataset.metadata.dropCount
  );
}

export function createIndexedDbDropTableStorage(): DropTableStorage {
  return {
    async get() {
      return get<DropTableDataset>(DROP_TABLE_CACHE_KEY);
    },
    async set(dataset) {
      await set(DROP_TABLE_CACHE_KEY, dataset);
    }
  };
}

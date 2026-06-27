import { describe, expect, it } from "vitest";
import { parseDropTableHtml, type DropTableDataset } from "../domain/dropTables";
import { dropTableSampleHtml } from "../test/dropTableSample";
import { createDropTableRepository, type DropTableStorage } from "./dropTableRepository";

describe("createDropTableRepository", () => {
  it("seeds browser storage from bundled data when no cache exists", async () => {
    const bundled = createDataset("2026-06-27T18:00:00.000Z");
    const storage = createMemoryStorage();
    const repository = createDropTableRepository(storage, bundled);

    const dataset = await repository.loadDataset();

    expect(dataset).toBe(bundled);
    await expect(storage.get()).resolves.toBe(bundled);
  });

  it("prefers the cached dataset when one exists", async () => {
    const bundled = createDataset("2026-06-27T18:00:00.000Z");
    const cached = createDataset("2026-07-01T18:00:00.000Z");
    const storage = createMemoryStorage(cached);
    const repository = createDropTableRepository(storage, bundled);

    const dataset = await repository.loadDataset();

    expect(dataset).toBe(cached);
  });

  it("replaces stale cached data when bundled data is newer", async () => {
    const bundled = createDataset("2026-07-01T18:00:00.000Z");
    const cached = createDataset("2026-06-27T18:00:00.000Z");
    const storage = createMemoryStorage(cached);
    const repository = createDropTableRepository(storage, bundled);

    const dataset = await repository.loadDataset();

    expect(dataset).toBe(bundled);
    await expect(storage.get()).resolves.toBe(bundled);
  });

  it("resets the cache back to the bundled dataset", async () => {
    const bundled = createDataset("2026-06-27T18:00:00.000Z");
    const cached = createDataset("2026-07-01T18:00:00.000Z");
    const storage = createMemoryStorage(cached);
    const repository = createDropTableRepository(storage, bundled);

    const dataset = await repository.resetToBundledDataset();

    expect(dataset).toBe(bundled);
    await expect(storage.get()).resolves.toBe(bundled);
  });
});

function createDataset(scrapedAt: string): DropTableDataset {
  return parseDropTableHtml(dropTableSampleHtml, {
    sourceUrl: "https://example.test/drop-tables.html",
    scrapedAt
  });
}

function createMemoryStorage(initialDataset?: DropTableDataset): DropTableStorage {
  let value = initialDataset;

  return {
    async get() {
      return value;
    },
    async set(dataset) {
      value = dataset;
    }
  };
}

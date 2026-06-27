import type { DropTableDataset } from "./dropTables";

export function validateDropTableDataset(dataset: DropTableDataset): void {
  if (!dataset.metadata.sourceUrl) {
    throw new Error("Drop table dataset must include source metadata.");
  }

  if (!dataset.metadata.scrapedAt) {
    throw new Error("Drop table dataset must include a scrape timestamp.");
  }

  if (dataset.sources.length === 0 || dataset.metadata.sourceCount === 0) {
    throw new Error("Drop table dataset must include at least one source.");
  }

  if (dataset.metadata.dropCount === 0) {
    throw new Error("Drop table dataset must include at least one drop.");
  }

  if (Object.keys(dataset.sourceToDrops).length === 0) {
    throw new Error("Drop table dataset must include a source-to-drops index.");
  }

  if (Object.keys(dataset.itemToSources).length === 0) {
    throw new Error("Drop table dataset must include an item-to-sources index.");
  }
}

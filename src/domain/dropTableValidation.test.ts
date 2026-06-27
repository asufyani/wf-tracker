import { describe, expect, it } from "vitest";
import { dropTableSampleHtml } from "../test/dropTableSample";
import { parseDropTableHtml, type DropTableDataset } from "./dropTables";
import { validateDropTableDataset } from "./dropTableValidation";

describe("validateDropTableDataset", () => {
  it("accepts a parsed dataset with sources, drops, and indexes", () => {
    const dataset = createDataset();

    expect(() => validateDropTableDataset(dataset)).not.toThrow();
  });

  it("rejects a dataset with no sources", () => {
    const dataset = createDataset();

    expect(() =>
      validateDropTableDataset({
        ...dataset,
        sources: [],
        metadata: {
          ...dataset.metadata,
          sourceCount: 0
        }
      })
    ).toThrow("Drop table dataset must include at least one source.");
  });

  it("rejects a dataset with no item index", () => {
    const dataset: DropTableDataset = {
      ...createDataset(),
      itemToSources: {}
    };

    expect(() => validateDropTableDataset(dataset)).toThrow("Drop table dataset must include an item-to-sources index.");
  });
});

function createDataset(): DropTableDataset {
  return parseDropTableHtml(dropTableSampleHtml, {
    sourceUrl: "https://example.test/drop-tables.html",
    scrapedAt: "2026-06-27T18:00:00.000Z"
  });
}

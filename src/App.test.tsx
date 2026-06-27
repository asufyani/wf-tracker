import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { createDropTableRepository, type DropTableStorage } from "./data/dropTableRepository";
import { parseDropTableHtml, type DropTableDataset } from "./domain/dropTables";
import { dropTableSampleHtml } from "./test/dropTableSample";
import { FarmPlannerApp } from "./App";

describe("FarmPlannerApp", () => {
  it("shows matching missions as rotation drop tables", async () => {
    const user = userEvent.setup();
    render(<FarmPlannerApp repository={createRepository()} />);

    await user.type(await screen.findByLabelText("Search item"), "100 Endo");

    const results = await screen.findAllByRole("article");
    expect(results).toHaveLength(2);

    expect(within(results[0]).getByText("Mercury/Apollodorus (Survival)")).toBeInTheDocument();
    expect(within(results[0]).getByRole("heading", { name: "Rotation A" })).toBeInTheDocument();
    expect(within(results[0]).getByRole("heading", { name: "Rotation B" })).toBeInTheDocument();
    expect(within(results[0]).getAllByRole("table")).toHaveLength(2);
    expect(within(results[0]).getByRole("row", { name: "100 Endo Common 50.00%" })).toBeInTheDocument();
    expect(within(results[0]).getByRole("row", { name: "Parry Rare 7.69%" })).toBeInTheDocument();

    expect(within(results[1]).getByText("Venus/Beacon Shield Ring (Caches)")).toBeInTheDocument();
    expect(within(results[1]).getByRole("heading", { name: "Rotation A" })).toBeInTheDocument();
    expect(within(results[1]).getByRole("row", { name: "100 Endo Uncommon 26.09%" })).toBeInTheDocument();
  });

  it("shows a clear empty state when no item matches", async () => {
    const user = userEvent.setup();
    render(<FarmPlannerApp repository={createRepository()} />);

    await user.type(await screen.findByLabelText("Search item"), "Argon Scope");

    expect(await screen.findByText("No drop sources found for Argon Scope.")).toBeInTheDocument();
  });

  it("resets the local cache to bundled data", async () => {
    const user = userEvent.setup();
    const bundled = createDataset("2026-06-27T18:00:00.000Z");
    const cached = createDataset("2026-07-01T18:00:00.000Z");
    const repository = createDropTableRepository(createMemoryStorage(cached), bundled);
    render(<FarmPlannerApp repository={repository} />);

    expect(await screen.findByText("Scraped Jul 1, 2026")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Reset local cache" }));

    expect(await screen.findByText("Scraped Jun 27, 2026")).toBeInTheDocument();
  });
});

function createRepository() {
  const bundled = createDataset("2026-06-27T18:00:00.000Z");
  return createDropTableRepository(createMemoryStorage(), bundled);
}

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

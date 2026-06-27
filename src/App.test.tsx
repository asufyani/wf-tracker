import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { createDropTableRepository, type DropTableStorage } from "./data/dropTableRepository";
import { parseDropTableHtml, type DropTableDataset } from "./domain/dropTables";
import { dropTableSampleHtml, primePartFarmSampleHtml } from "./test/dropTableSample";
import { PRIME_PART_WISHLIST_STORAGE_KEY } from "./usePersistentWishlist";
import { FarmPlannerApp } from "./App";

describe("FarmPlannerApp", () => {
  beforeEach(() => {
    localStorage.clear();
  });

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

    const marsFarm = await screen.findByText("Mars/Spear (Defense)");
    const marsArticle = marsFarm.closest("article");
    expect(marsArticle).not.toBeNull();
    expect(within(marsArticle!).getByRole("row", { name: "Lith Z9 Relic Common 33.33% Akbronco Prime Link Rare 2.00%" })).toBeInTheDocument();
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
});

function createRepository(html = dropTableSampleHtml) {
  const bundled = createDataset("2026-06-27T18:00:00.000Z", html);
  return createDropTableRepository(createMemoryStorage(), bundled);
}

function createDataset(scrapedAt: string, html = dropTableSampleHtml): DropTableDataset {
  return parseDropTableHtml(html, {
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

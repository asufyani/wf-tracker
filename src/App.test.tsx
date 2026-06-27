import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  it("marks the active planner view as current", async () => {
    const user = userEvent.setup();
    render(<FarmPlannerApp repository={createRepository()} />);

    const itemSearchButton = await screen.findByRole("button", { name: "Item Search" });
    const wishlistButton = screen.getByRole("button", { name: "Wishlist" });

    expect(itemSearchButton).toHaveAttribute("aria-current", "page");
    expect(wishlistButton).not.toHaveAttribute("aria-current");

    await user.click(wishlistButton);

    expect(wishlistButton).toHaveAttribute("aria-current", "page");
    expect(itemSearchButton).not.toHaveAttribute("aria-current");
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
    render(<FarmPlannerApp loadFissures={loadNoFissures} repository={createRepository(primePartFarmSampleHtml)} />);

    await user.click(await screen.findByRole("button", { name: "Wishlist" }));
    await user.type(screen.getByLabelText("Search prime part"), "Akbronco");
    await user.click(await screen.findByRole("button", { name: "Add Akbronco Prime Link" }));

    expect(screen.getByRole("heading", { name: "Akbronco Prime" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Akbronco Prime parts" })).getByText("Link")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Relic Farms" }));

    const results = await screen.findAllByRole("article");
    expect(results[0]).toHaveTextContent("Mars/Spear (Defense)");
    expect(within(results[0]).getByRole("row", { name: "Lith Z9 Relic Common 33.33% Akbronco Prime Link Rare 2.00%" })).toBeInTheDocument();
    expect(screen.queryByText("Level 5 - 15 Cetus Bounty")).not.toBeInTheDocument();
  });

  it("restores the wishlist from localStorage", async () => {
    localStorage.setItem(PRIME_PART_WISHLIST_STORAGE_KEY, JSON.stringify(["Akbronco Prime Link"]));
    const user = userEvent.setup();
    render(<FarmPlannerApp loadFissures={loadNoFissures} repository={createRepository(primePartFarmSampleHtml)} />);

    await user.click(await screen.findByRole("button", { name: "Wishlist" }));

    expect(screen.getByRole("heading", { name: "Akbronco Prime" })).toBeInTheDocument();
    expect(within(screen.getByRole("list", { name: "Akbronco Prime parts" })).getByText("Link")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Relic Farms" }));

    const marsFarm = await screen.findByText("Mars/Spear (Defense)");
    const marsArticle = marsFarm.closest("article");
    expect(marsArticle).not.toBeNull();
    expect(within(marsArticle!).getByRole("row", { name: "Lith Z9 Relic Common 33.33% Akbronco Prime Link Rare 2.00%" })).toBeInTheDocument();
  });

  it("removes a prime part from the wishlist and clears relic farms", async () => {
    localStorage.setItem(PRIME_PART_WISHLIST_STORAGE_KEY, JSON.stringify(["Akbronco Prime Link"]));
    const user = userEvent.setup();
    render(<FarmPlannerApp loadFissures={loadNoFissures} repository={createRepository(primePartFarmSampleHtml)} />);

    await user.click(await screen.findByRole("button", { name: "Wishlist" }));
    await user.click(screen.getByRole("button", { name: "Remove Akbronco Prime Link" }));
    await user.click(screen.getByRole("button", { name: "Relic Farms" }));

    expect(screen.getByText("Add prime parts to your wishlist to see relic farm missions.")).toBeInTheDocument();
  });

  it("groups relic farm drops by mission and rotation without React duplicate key warnings", async () => {
    localStorage.setItem(PRIME_PART_WISHLIST_STORAGE_KEY, JSON.stringify(["Akbronco Prime Link"]));
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const user = userEvent.setup();

    try {
      render(<FarmPlannerApp loadFissures={loadNoFissures} repository={createRepository(duplicateRelicFarmSampleHtml)} />);
      await user.click(await screen.findByRole("button", { name: "Relic Farms" }));

      const results = await screen.findAllByRole("article");
      expect(results).toHaveLength(1);
      expect(within(results[0]).getByText("Mars/Spear (Defense)")).toBeInTheDocument();
      expect(within(results[0]).getByRole("heading", { name: "Rotation A" })).toBeInTheDocument();
      expect(within(results[0]).getByRole("heading", { name: "Rotation B" })).toBeInTheDocument();
      expect(within(results[0]).getAllByRole("table")).toHaveLength(2);
      expect(
        within(results[0]).getAllByRole("row", {
          name: "Lith Z9 Relic Common 33.33% Akbronco Prime Link Rare 2.00%"
        })
      ).toHaveLength(2);
      expect(
        within(results[0]).getByRole("row", {
          name: "Lith C14 Relic Rare 7.69% Akbronco Prime Link Common 25.33%"
        })
      ).toBeInTheDocument();
      const duplicateKeyWarnings = consoleError.mock.calls.filter(([firstArg]) =>
        String(firstArg).includes("Encountered two children with the same key")
      );
      expect(duplicateKeyWarnings).toHaveLength(0);
    } finally {
      consoleError.mockRestore();
    }
  });

  it("highlights relic farm missions with an active fissure on the same node", async () => {
    localStorage.setItem(PRIME_PART_WISHLIST_STORAGE_KEY, JSON.stringify(["Akbronco Prime Link"]));
    const user = userEvent.setup();
    const loadFissures = vi.fn().mockResolvedValue([
      {
        id: "fissure-1",
        node: "Spear (Mars)",
        missionType: "Defense",
        tier: "Lith",
        expiry: "2099-06-27T19:00:00.000Z",
        isStorm: false,
        isHard: false
      }
    ]);
    render(
      <FarmPlannerApp
        fissurePollIntervalMs={60_000}
        loadFissures={loadFissures}
        repository={createRepository(primePartFarmSampleHtml)}
      />
    );

    await user.click(await screen.findByRole("button", { name: "Relic Farms" }));

    const marsFarm = await screen.findByText("Mars/Spear (Defense)");
    const marsArticle = marsFarm.closest("article");
    expect(marsArticle).not.toBeNull();
    expect(await within(marsArticle!).findByText("Active Lith Fissure")).toBeInTheDocument();
    expect(marsArticle).toHaveClass("active-fissure-card");
  });

  it("ranks relic farm mission cards by total mission chance", async () => {
    localStorage.setItem(
      PRIME_PART_WISHLIST_STORAGE_KEY,
      JSON.stringify(["Akbronco Prime Link", "Paris Prime String"])
    );
    const user = userEvent.setup();
    render(<FarmPlannerApp loadFissures={loadNoFissures} repository={createRepository(totalMissionChanceSampleHtml)} />);

    await user.click(await screen.findByRole("button", { name: "Relic Farms" }));

    const results = await screen.findAllByRole("article");
    expect(within(results[0]).getByText("Venus/Unda (Spy)")).toBeInTheDocument();
    expect(within(results[1]).getByText("Mars/Spear (Defense)")).toBeInTheDocument();
  });
});

async function loadNoFissures() {
  return [];
}

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

const duplicateRelicFarmSampleHtml = `
  <html>
    <body>
      <h3>Last Update: 08 April, 2026</h3>
      <h3>Missions:</h3>
      <p>Mars/Spear (Defense)</p>
      <p>Rotation A</p>
      <p>Lith Z9 Relic Common (33.33%)</p>
      <p>Lith Z9 Relic Common (33.33%)</p>
      <p>Rotation B</p>
      <p>Lith C14 Relic Rare (7.69%)</p>
      <h3>Relics:</h3>
      <p>Lith Z9 Relic (Intact)</p>
      <p>Akbronco Prime Link Rare (2.00%)</p>
      <p>Lith C14 Relic (Intact)</p>
      <p>Akbronco Prime Link Common (25.33%)</p>
    </body>
  </html>
`;

const totalMissionChanceSampleHtml = `
  <html>
    <body>
      <h3>Last Update: 08 April, 2026</h3>
      <h3>Missions:</h3>
      <p>Mars/Spear (Defense)</p>
      <p>Rotation A</p>
      <p>Lith Z9 Relic Common (40.00%)</p>
      <p>Venus/Unda (Spy)</p>
      <p>Rotation A</p>
      <p>Lith C14 Relic Common (25.00%)</p>
      <p>Lith P2 Relic Common (25.00%)</p>
      <h3>Relics:</h3>
      <p>Lith Z9 Relic (Intact)</p>
      <p>Akbronco Prime Link Common (25.33%)</p>
      <p>Lith C14 Relic (Intact)</p>
      <p>Akbronco Prime Link Common (25.33%)</p>
      <p>Lith P2 Relic (Intact)</p>
      <p>Paris Prime String Common (25.33%)</p>
    </body>
  </html>
`;

import { describe, expect, it, vi } from "vitest";
import { loadCurrentFissures } from "./loadCurrentFissures";

describe("loadCurrentFissures", () => {
  it("loads and parses current fissures from WarframeStatus", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => [
        {
          id: "fissure-1",
          node: "Spear (Mars)",
          missionType: "Defense",
          tier: "Lith",
          expiry: "2026-06-27T19:00:00.000Z",
          isStorm: false,
          isHard: false
        }
      ]
    });

    await expect(loadCurrentFissures(fetcher)).resolves.toEqual([
      {
        id: "fissure-1",
        node: "Spear (Mars)",
        missionType: "Defense",
        tier: "Lith",
        expiry: "2026-06-27T19:00:00.000Z",
        isStorm: false,
        isHard: false
      }
    ]);
    expect(fetcher).toHaveBeenCalledWith("https://api.warframestat.us/pc/fissures/");
  });

  it("fails when the fissure endpoint does not return a successful response", async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => []
    });

    await expect(loadCurrentFissures(fetcher)).rejects.toThrow("Unable to load current fissures: 503");
  });
});

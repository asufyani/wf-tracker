import { describe, expect, it } from "vitest";
import { findActiveFissureForMission, parseFissureMissions } from "./fissures";

describe("parseFissureMissions", () => {
  it("keeps valid fissure mission fields from the WarframeStatus response", () => {
    const fissures = parseFissureMissions([
      {
        id: "fissure-1",
        node: "Spear (Mars)",
        missionType: "Defense",
        tier: "Lith",
        expiry: "2026-06-27T19:00:00.000Z",
        isStorm: false,
        isHard: true
      },
      {
        id: "invalid"
      }
    ]);

    expect(fissures).toEqual([
      {
        id: "fissure-1",
        node: "Spear (Mars)",
        missionType: "Defense",
        tier: "Lith",
        expiry: "2026-06-27T19:00:00.000Z",
        isStorm: false,
        isHard: true
      }
    ]);
  });
});

describe("findActiveFissureForMission", () => {
  it("matches a drop-table mission to an active fissure by exact node", () => {
    const fissure = findActiveFissureForMission(
      "Mars/Spear (Defense)",
      [
        {
          id: "fissure-1",
          node: "Spear (Mars)",
          missionType: "Defense",
          tier: "Lith",
          expiry: "2026-06-27T19:00:00.000Z",
          isStorm: false,
          isHard: false
        }
      ],
      new Date("2026-06-27T18:00:00.000Z")
    );

    expect(fissure?.id).toBe("fissure-1");
  });

  it("ignores mission type when matching an active fissure node", () => {
    const fissure = findActiveFissureForMission(
      "Venus/Beacon Shield Ring (Caches)",
      [
        {
          id: "fissure-1",
          node: "Beacon Shield Ring (Venus)",
          missionType: "Defense",
          tier: "Lith",
          expiry: "2026-06-27T19:00:00.000Z",
          isStorm: false,
          isHard: false
        }
      ],
      new Date("2026-06-27T18:00:00.000Z")
    );

    expect(fissure?.id).toBe("fissure-1");
  });

  it("does not match another active fissure from the same relic tier", () => {
    const fissure = findActiveFissureForMission(
      "Mars/Spear (Defense)",
      [
        {
          id: "fissure-1",
          node: "Unda (Venus)",
          missionType: "Spy",
          tier: "Lith",
          expiry: "2026-06-27T19:00:00.000Z",
          isStorm: false,
          isHard: false
        }
      ],
      new Date("2026-06-27T18:00:00.000Z")
    );

    expect(fissure).toBeUndefined();
  });

  it("ignores exact fissure missions after they expire", () => {
    const fissure = findActiveFissureForMission(
      "Mars/Spear (Defense)",
      [
        {
          id: "fissure-1",
          node: "Spear (Mars)",
          missionType: "Defense",
          tier: "Lith",
          expiry: "2026-06-27T17:59:59.000Z",
          isStorm: false,
          isHard: false
        }
      ],
      new Date("2026-06-27T18:00:00.000Z")
    );

    expect(fissure).toBeUndefined();
  });
});

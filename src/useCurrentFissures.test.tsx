import { render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { FissureMission } from "./domain/fissures";
import { useCurrentFissures } from "./useCurrentFissures";

describe("useCurrentFissures", () => {
  it("loads current fissures immediately and polls on the configured interval", async () => {
    const firstFissure = createFissure("fissure-1");
    const secondFissure = createFissure("fissure-2");
    const loadFissures = vi.fn().mockResolvedValueOnce([firstFissure]).mockResolvedValueOnce([secondFissure]);

    render(<FissureProbe loadFissures={loadFissures} pollIntervalMs={20} />);

    expect(loadFissures).toHaveBeenCalledTimes(1);
    expect(await screen.findByLabelText("fissure state")).toHaveTextContent("ready:1:fissure-1");

    await waitFor(() => expect(loadFissures).toHaveBeenCalledTimes(2));
    expect(screen.getByLabelText("fissure state")).toHaveTextContent("ready:1:fissure-2");
  });

  it("does not load fissures while disabled", () => {
    const loadFissures = vi.fn();

    render(<FissureProbe enabled={false} loadFissures={loadFissures} pollIntervalMs={1000} />);

    expect(loadFissures).not.toHaveBeenCalled();
    expect(screen.getByLabelText("fissure state")).toHaveTextContent("idle:0:none");
  });
});

function FissureProbe({
  enabled = true,
  loadFissures,
  pollIntervalMs
}: {
  enabled?: boolean;
  loadFissures: () => Promise<FissureMission[]>;
  pollIntervalMs: number;
}) {
  const { fissures, status } = useCurrentFissures({ enabled, loadFissures, pollIntervalMs });
  return (
    <output aria-label="fissure state">
      {status}:{fissures.length}:{fissures[0]?.id ?? "none"}
    </output>
  );
}

function createFissure(id: string): FissureMission {
  return {
    id,
    node: "Spear (Mars)",
    missionType: "Defense",
    tier: "Lith",
    expiry: "2026-06-27T19:00:00.000Z",
    isStorm: false,
    isHard: false
  };
}

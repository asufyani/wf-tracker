import { useEffect, useState } from "react";
import { loadCurrentFissures } from "./data/loadCurrentFissures";
import type { FissureMission } from "./domain/fissures";

const DEFAULT_FISSURE_POLL_INTERVAL_MS = 5 * 60 * 1000;

export type CurrentFissuresStatus = "idle" | "loading" | "ready" | "error";

export interface CurrentFissuresState {
  fissures: FissureMission[];
  status: CurrentFissuresStatus;
  updatedAt?: Date;
}

interface UseCurrentFissuresOptions {
  enabled?: boolean;
  loadFissures?: () => Promise<FissureMission[]>;
  pollIntervalMs?: number;
}

export function useCurrentFissures({
  enabled = true,
  loadFissures = loadCurrentFissures,
  pollIntervalMs = DEFAULT_FISSURE_POLL_INTERVAL_MS
}: UseCurrentFissuresOptions = {}): CurrentFissuresState {
  const [state, setState] = useState<CurrentFissuresState>({
    fissures: [],
    status: "idle"
  });

  useEffect(() => {
    if (!enabled) {
      setState({
        fissures: [],
        status: "idle"
      });
      return undefined;
    }

    let isCurrent = true;

    async function refreshFissures() {
      setState((currentState) => ({
        ...currentState,
        status: currentState.status === "idle" ? "loading" : currentState.status
      }));

      try {
        const fissures = await loadFissures();
        if (isCurrent) {
          setState({
            fissures,
            status: "ready",
            updatedAt: new Date()
          });
        }
      } catch {
        if (isCurrent) {
          setState((currentState) => ({
            ...currentState,
            status: "error"
          }));
        }
      }
    }

    void refreshFissures();
    const intervalId = window.setInterval(refreshFissures, pollIntervalMs);

    return () => {
      isCurrent = false;
      window.clearInterval(intervalId);
    };
  }, [enabled, loadFissures, pollIntervalMs]);

  return state;
}

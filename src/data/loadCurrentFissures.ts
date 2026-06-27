import { parseFissureMissions, type FissureMission } from "../domain/fissures";

const CURRENT_FISSURES_URL = "https://api.warframestat.us/pc/fissures/";

export type FissureFetcher = (url: string) => Promise<{
  ok: boolean;
  status: number;
  json(): Promise<unknown>;
}>;

export async function loadCurrentFissures(fetcher: FissureFetcher = fetch): Promise<FissureMission[]> {
  const response = await fetcher(CURRENT_FISSURES_URL);
  if (!response.ok) {
    throw new Error(`Unable to load current fissures: ${response.status}`);
  }

  return parseFissureMissions(await response.json());
}

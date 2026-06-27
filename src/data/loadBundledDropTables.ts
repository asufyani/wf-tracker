import type { DropTableDataset } from "../domain/dropTables";
import { validateDropTableDataset } from "../domain/dropTableValidation";

export async function loadBundledDropTables(baseUrl = import.meta.env.BASE_URL): Promise<DropTableDataset> {
  const response = await fetch(`${baseUrl.replace(/\/$/, "")}/data/drop-tables.json`);

  if (!response.ok) {
    throw new Error(`Unable to load bundled drop tables: ${response.status}`);
  }

  const dataset = (await response.json()) as DropTableDataset;
  validateDropTableDataset(dataset);
  return dataset;
}

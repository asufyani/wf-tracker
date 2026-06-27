import { readFile } from "node:fs/promises";
import { validateDropTableDataset } from "../src/domain/dropTableValidation";
import type { DropTableDataset } from "../src/domain/dropTables";

const DEFAULT_INPUT_PATH = "public/data/drop-tables.json";

async function main() {
  const inputPath = process.env.DROP_TABLE_OUTPUT ?? DEFAULT_INPUT_PATH;
  const dataset = JSON.parse(await readFile(inputPath, "utf8")) as DropTableDataset;

  validateDropTableDataset(dataset);
  console.log(
    `Validated ${dataset.metadata.sourceCount.toLocaleString()} sources and ${dataset.metadata.dropCount.toLocaleString()} drops from ${inputPath}.`
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

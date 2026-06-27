import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseDropTableHtml } from "../src/domain/dropTables";
import { validateDropTableDataset } from "../src/domain/dropTableValidation";

const DEFAULT_DROP_TABLE_URL =
  "https://warframe-web-assets.nyc3.cdn.digitaloceanspaces.com/uploads/cms/hnfvc0o3jnfvc873njb03enrf56.html";
const DEFAULT_OUTPUT_PATH = "public/data/drop-tables.json";

async function main() {
  const sourceUrl = process.env.DROP_TABLE_URL ?? DEFAULT_DROP_TABLE_URL;
  const outputPath = process.env.DROP_TABLE_OUTPUT ?? DEFAULT_OUTPUT_PATH;
  const response = await fetch(sourceUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch drop tables from ${sourceUrl}: ${response.status} ${response.statusText}`);
  }

  const html = await response.text();
  const dataset = parseDropTableHtml(html, {
    sourceUrl,
    scrapedAt: new Date().toISOString()
  });

  validateDropTableDataset(dataset);

  await mkdir(path.dirname(outputPath), { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(dataset, null, 2)}\n`, "utf8");

  console.log(
    `Wrote ${dataset.metadata.sourceCount.toLocaleString()} sources and ${dataset.metadata.dropCount.toLocaleString()} drops to ${outputPath}.`
  );
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});

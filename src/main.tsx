import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { FarmPlannerApp } from "./App";
import { createDropTableRepository, createIndexedDbDropTableStorage } from "./data/dropTableRepository";
import { loadBundledDropTables } from "./data/loadBundledDropTables";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element not found.");
}

const root = createRoot(rootElement);

root.render(
  <StrictMode>
    <main className="app-shell">
      <section className="status-panel">
        <h1>Warframe Farm Planner</h1>
        <p>Loading drop tables...</p>
      </section>
    </main>
  </StrictMode>
);

loadBundledDropTables()
  .then((bundledDataset) => {
    const repository = createDropTableRepository(createIndexedDbDropTableStorage(), bundledDataset);

    root.render(
      <StrictMode>
        <FarmPlannerApp repository={repository} />
      </StrictMode>
    );
  })
  .catch(() => {
    root.render(
      <StrictMode>
        <main className="app-shell">
          <section className="status-panel" role="alert">
            <h1>Warframe Farm Planner</h1>
            <p>Drop table data could not be loaded.</p>
          </section>
        </main>
      </StrictMode>
    );
  });

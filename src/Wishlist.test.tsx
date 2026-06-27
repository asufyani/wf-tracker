import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WishlistView } from "./Wishlist";

describe("WishlistView", () => {
  it("groups wished prime parts under their prime item", () => {
    render(
      <WishlistView
        matchingPrimeParts={[]}
        onAddPart={vi.fn()}
        onPrimePartQueryChange={vi.fn()}
        onRemovePart={vi.fn()}
        primePartQuery=""
        wishlist={["Afentis Prime Barrel", "Afentis Prime Blade", "Bronco Prime Barrel"]}
      />
    );

    expect(screen.getByRole("heading", { name: "Afentis Prime" })).toBeInTheDocument();
    expect(screen.queryByText("Afentis Prime Barrel")).not.toBeInTheDocument();
    expect(screen.queryByText("Afentis Prime Blade")).not.toBeInTheDocument();

    const afentisParts = within(screen.getByRole("list", { name: "Afentis Prime parts" }));
    expect(afentisParts.getByText("Barrel")).toBeInTheDocument();
    expect(afentisParts.getByText("Blade")).toBeInTheDocument();
    expect(afentisParts.getByRole("button", { name: "Remove Afentis Prime Barrel" })).toBeInTheDocument();
    expect(afentisParts.getByRole("button", { name: "Remove Afentis Prime Blade" })).toBeInTheDocument();

    const broncoParts = within(screen.getByRole("list", { name: "Bronco Prime parts" }));
    expect(broncoParts.getByText("Barrel")).toBeInTheDocument();
  });
});

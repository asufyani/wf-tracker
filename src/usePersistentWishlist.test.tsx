import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";
import { PRIME_PART_WISHLIST_STORAGE_KEY, usePersistentWishlist } from "./usePersistentWishlist";

function WishlistHarness({ storageKey = PRIME_PART_WISHLIST_STORAGE_KEY }: { storageKey?: string }) {
  const { wishlist, addToWishlist, removeFromWishlist } = usePersistentWishlist(storageKey);

  return (
    <section>
      <p data-testid="wishlist-value">{wishlist.length > 0 ? wishlist.join("|") : "empty"}</p>
      <button onClick={() => addToWishlist("Akbronco Prime Link")} type="button">
        Add Akbronco
      </button>
      <button onClick={() => addToWishlist(" akbronco prime link ")} type="button">
        Add Duplicate
      </button>
      <button onClick={() => addToWishlist("   ")} type="button">
        Add Whitespace
      </button>
      <button onClick={() => addToWishlist("Zephyr Prime Grip")} type="button">
        Add Zephyr
      </button>
      <button onClick={() => removeFromWishlist("Akbronco Prime Link")} type="button">
        Remove Akbronco
      </button>
    </section>
  );
}

describe("usePersistentWishlist", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("loads the wishlist from localStorage", () => {
    localStorage.setItem(PRIME_PART_WISHLIST_STORAGE_KEY, JSON.stringify(["Paris Prime String"]));

    render(<WishlistHarness />);

    expect(screen.getByTestId("wishlist-value")).toHaveTextContent("Paris Prime String");
  });

  it("ignores invalid JSON from localStorage", () => {
    localStorage.setItem(PRIME_PART_WISHLIST_STORAGE_KEY, "not valid JSON");

    render(<WishlistHarness />);

    expect(screen.getByTestId("wishlist-value")).toHaveTextContent("empty");
  });

  it("ignores non-array JSON from localStorage", () => {
    localStorage.setItem(PRIME_PART_WISHLIST_STORAGE_KEY, JSON.stringify({ itemName: "Paris Prime String" }));

    render(<WishlistHarness />);

    expect(screen.getByTestId("wishlist-value")).toHaveTextContent("empty");
  });

  it("adds, deduplicates, removes, and persists wishlist entries", async () => {
    const user = userEvent.setup();
    render(<WishlistHarness />);

    await user.click(screen.getByRole("button", { name: "Add Akbronco" }));
    await user.click(screen.getByRole("button", { name: "Add Duplicate" }));

    expect(screen.getByTestId("wishlist-value")).toHaveTextContent("Akbronco Prime Link");
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(PRIME_PART_WISHLIST_STORAGE_KEY) ?? "[]")).toEqual([
        "Akbronco Prime Link"
      ]);
    });

    await user.click(screen.getByRole("button", { name: "Remove Akbronco" }));

    expect(screen.getByTestId("wishlist-value")).toHaveTextContent("empty");
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(PRIME_PART_WISHLIST_STORAGE_KEY) ?? "[]")).toEqual([]);
    });
  });

  it("ignores whitespace-only additions", async () => {
    const user = userEvent.setup();
    render(<WishlistHarness />);

    await user.click(screen.getByRole("button", { name: "Add Whitespace" }));

    expect(screen.getByTestId("wishlist-value")).toHaveTextContent("empty");
    await waitFor(() => {
      expect(JSON.parse(localStorage.getItem(PRIME_PART_WISHLIST_STORAGE_KEY) ?? "[]")).toEqual([]);
    });
  });

  it("sorts additions alphabetically", async () => {
    const user = userEvent.setup();
    render(<WishlistHarness />);

    await user.click(screen.getByRole("button", { name: "Add Zephyr" }));
    await user.click(screen.getByRole("button", { name: "Add Akbronco" }));

    expect(screen.getByTestId("wishlist-value")).toHaveTextContent("Akbronco Prime Link|Zephyr Prime Grip");
  });
});

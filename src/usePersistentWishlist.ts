import { useEffect, useState } from "react";

export const PRIME_PART_WISHLIST_STORAGE_KEY = "wf-tracker:prime-part-wishlist:v1";

export interface PersistentWishlist {
  wishlist: string[];
  addToWishlist(itemName: string): void;
  removeFromWishlist(itemName: string): void;
}

export function usePersistentWishlist(storageKey = PRIME_PART_WISHLIST_STORAGE_KEY): PersistentWishlist {
  const [wishlist, setWishlist] = useState<string[]>(() => readStoredWishlist(storageKey));

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(wishlist));
  }, [storageKey, wishlist]);

  function addToWishlist(itemName: string) {
    const canonicalName = itemName.trim();
    if (!canonicalName) {
      return;
    }

    setWishlist((currentWishlist) => {
      if (currentWishlist.some((currentName) => currentName.toLowerCase() === canonicalName.toLowerCase())) {
        return currentWishlist;
      }

      return [...currentWishlist, canonicalName].sort((left, right) => left.localeCompare(right));
    });
  }

  function removeFromWishlist(itemName: string) {
    const itemKey = itemName.trim().toLowerCase();
    setWishlist((currentWishlist) => currentWishlist.filter((currentName) => currentName.toLowerCase() !== itemKey));
  }

  return {
    wishlist,
    addToWishlist,
    removeFromWishlist
  };
}

function readStoredWishlist(storageKey: string): string[] {
  const storedWishlist = localStorage.getItem(storageKey);
  if (!storedWishlist) {
    return [];
  }

  try {
    const parsedWishlist = JSON.parse(storedWishlist);
    if (!Array.isArray(parsedWishlist)) {
      return [];
    }

    return parsedWishlist.filter((itemName): itemName is string => typeof itemName === "string" && itemName.trim());
  } catch {
    return [];
  }
}

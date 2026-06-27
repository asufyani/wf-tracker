export function WishlistView({
  matchingPrimeParts, onAddPart, onPrimePartQueryChange, onRemovePart, primePartQuery, wishlist
}: {
  matchingPrimeParts: string[];
  onAddPart(itemName: string): void;
  onPrimePartQueryChange(value: string): void;
  onRemovePart(itemName: string): void;
  primePartQuery: string;
  wishlist: string[];
}) {
  const groupedWishlist = groupWishlistParts(wishlist);

  return (
    <section className="wishlist-layout" aria-label="Prime part wishlist">
      <div className="wishlist-panel">
        <label className="search-field">
          <span>Search prime part</span>
          <input
            aria-label="Search prime part"
            onChange={(event) => onPrimePartQueryChange(event.target.value)}
            placeholder="Try Akbronco Prime Link"
            type="search"
            value={primePartQuery} />
        </label>
        {primePartQuery.trim().length >= 2 ? (
          matchingPrimeParts.length > 0 ? (
            <div className="suggestions" aria-label="Matching prime part suggestions">
              {matchingPrimeParts.map((itemName) => (
                <button key={itemName} onClick={() => onAddPart(itemName)} type="button">
                  Add {itemName}
                </button>
              ))}
            </div>
          ) : (
            <p className="muted-copy">No unwishlisted prime parts match that search.</p>
          )
        ) : (
          <p className="muted-copy">Search relic rewards to add prime parts.</p>
        )}
      </div>

      <div className="wishlist-panel">
        <h2>Wishlist</h2>
        {wishlist.length > 0 ? (
          <ul className="wishlist-list" aria-label="Wishlist parts">
            {groupedWishlist.map((group) => (
              <li className="wishlist-group" key={group.itemName}>
                <h3>{group.itemName}</h3>
                <ul className="wishlist-part-list" aria-label={`${group.itemName} parts`}>
                  {group.parts.map((part) => (
                    <li key={part.itemName}>
                      <span>{part.partName}</span>
                      <button
                        aria-label={`Remove ${part.itemName}`}
                        onClick={() => onRemovePart(part.itemName)}
                        type="button">
                        X
                      </button>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted-copy">No prime parts saved yet.</p>
        )}
      </div>
    </section>
  );
}

interface WishlistGroup {
  itemName: string;
  parts: WishlistPart[];
}

interface WishlistPart {
  itemName: string;
  partName: string;
}

function groupWishlistParts(wishlist: string[]): WishlistGroup[] {
  const groups = new Map<string, WishlistGroup>();

  for (const itemName of wishlist) {
    const primePartName = splitPrimePartName(itemName);
    const part = {
      itemName,
      partName: primePartName.partName
    };
    const group = groups.get(primePartName.primeItemName);

    if (group) {
      group.parts.push(part);
    } else {
      groups.set(primePartName.primeItemName, {
        itemName: primePartName.primeItemName,
        parts: [part]
      });
    }
  }

  return [...groups.values()]
    .map((group) => ({
      ...group,
      parts: [...group.parts].sort((left, right) => left.partName.localeCompare(right.partName))
    }))
    .sort((left, right) => left.itemName.localeCompare(right.itemName));
}

interface PrimePartName {
  primeItemName: string;
  partName: string;
}

function splitPrimePartName(itemName: string): PrimePartName {
  const match = /^(.+\bPrime)\s+(.+)$/.exec(itemName);
  if (!match) {
    return {
      primeItemName: itemName,
      partName: itemName
    };
  }

  return {
    primeItemName: match[1],
    partName: match[2]
  };
}

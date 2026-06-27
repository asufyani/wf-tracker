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
            {wishlist.map((itemName) => (
              <li key={itemName}>
                <span>{itemName}</span>
                <button aria-label={`Remove ${itemName}`} onClick={() => onRemovePart(itemName)} type="button">
                  X
                </button>
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

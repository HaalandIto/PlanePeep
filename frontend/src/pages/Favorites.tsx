/**
 * Favorites page — loads and edits the user's saved favorites.
 *
 * ## Data flow (high level)
 * ```
 * token present → useEffect → getFavorites(token) → FavoriteListItem[] in state → FavoritesCard list
 *     │
 *     └─ no token → clear list, skip network (user sees “log in” messaging)
 * ```
 *
 * ## Async calls (all from `../api`, implemented in `api.ts`)
 * | User action   | API helper            | After success |
 * |---------------|----------------------|----------------|
 * | (page mount)  | `getFavorites`       | `setFavorites`, clear `loadError` |
 * | Remove        | `deleteFavorite`     | Filter item out of local state |
 * | Rename        | `patchFavoriteName`  | Update `name` on matching item |
 * | Move up/down  | `patchFavoriteOrder` | `getFavorites` again so order matches server |
 *
 * Each handler uses `try/catch`; failures set `actionError` (mutations) or `loadError` (initial load).
 * The `useEffect` uses a `cancelled` flag so a slow response does not call `setState` after unmount
 * or after `token` changed (e.g. logout).
 *
 * ## Types
 * List entries are {@link FavoriteListItem} from `api.ts` (already normalized there). The card does
 * not re-parse raw JSON — see `normalizeFavoriteListItem` in `api.ts` for why that lives in the API layer.
 */
import { Link } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import FavoritesCard from '../components/FavoritesCard';
import type { FavoriteListItem, ApiError } from '../api';
import { getFavorites, deleteFavorite, patchFavoriteName, patchFavoriteOrder } from '../api';

/** Route props: JWT for API calls; optional callback when the user clicks a favorite title to search. */
interface FavoritesProps {
    onSearchFromCardTitle?: (tail: string) => void;
    token?: string | null;
    onLogout?: () => void;
}

/** Favorites route: loads list when `token` is set and wires card actions to REST helpers. */
export default function Favorites({ onSearchFromCardTitle, token, onLogout }: FavoritesProps) {
    const [favorites, setFavorites] = useState<FavoriteListItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);

    const isAuthenticated = Boolean(token);

    /**
     * Loads or clears the list whenever the session token changes.
     * Uses `cancelled` to ignore late responses after logout, unmount, or token swap.
     */
    useEffect(() => {
        if (!token) {
            setFavorites([]);
            setLoadError(null);
            setLoading(false);
            return;
        }

        let cancelled = false;
        setLoading(true);
        setLoadError(null);

        void (async () => {
            try {
                const list = await getFavorites(token);
                if (!cancelled) setFavorites(list);
            } catch (e) {
                if (!cancelled) {
                    setFavorites([]);
                    if ((e as ApiError).status === 401) {
                        onLogout?.();
                    } else {
                        setLoadError((e as Error).message || 'Failed to load favorites');
                    }
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();

        return () => {
            cancelled = true;
        };
    }, [token]);

    /**
     * DELETE favorite, then drop it from local state on success (no full refetch).
     * @param favoriteId - Same id as {@link FavoriteListItem.favoriteId}.
     */
    const handleRemove = useCallback(
        async (favoriteId: string | number) => {
            if (!token) return;
            setActionError(null);
            try {
                await deleteFavorite(String(favoriteId), token);
                setFavorites((prev) => prev.filter((f) => f.favoriteId !== favoriteId));
            } catch (e) {
                setActionError((e as Error).message || 'Failed to remove favorite');
            }
        },
        [token],
    );

    /**
     * PATCH reorder on the server, then GET the full list so UI order matches persisted order.
     * @param favoriteId - Row to move.
     * @param direction - Passed through to `patchFavoriteOrder`.
     */
    const handleMove = useCallback(
        async (favoriteId: string | number, direction: 'up' | 'down') => {
            if (!token) return;
            setActionError(null);
            try {
                await patchFavoriteOrder(favoriteId, direction, token);
                const list = await getFavorites(token);
                setFavorites(list);
            } catch (e) {
                setActionError((e as Error).message || 'Failed to reorder');
            }
        },
        [token],
    );

    /**
     * PATCH display name, then patch the matching row in state (avoids a second GET).
     * @param favoriteId - Row to update.
     * @param name - New label from the card’s inline editor.
     */
    const handleRename = useCallback(
        async (favoriteId: string | number, name: string) => {
            if (!token) return;
            setActionError(null);
            try {
                await patchFavoriteName(favoriteId, name, token);
                setFavorites((prev) =>
                    prev.map((f) => (f.favoriteId === favoriteId ? { ...f, name } : f)),
                );
            } catch (e) {
                setActionError((e as Error).message || 'Failed to rename');
            }
        },
        [token],
    );

    return (
        <div className='app-page'>
            <div className='app-page__content'>
                <nav className='app-page__nav'>
                    <Link to='/' className='app-page__nav-link'>
                        ← Back
                    </Link>
                </nav>
                <h1 className='app-page__title'>Favorites</h1>
                <p className='app-page__tagline'>
                    {isAuthenticated
                        ? 'Your saved flights.'
                        : 'Log in to save and manage favorites across sessions.'}
                </p>
                {loadError && (
                    <p className='app-page__section--muted' role='alert'>
                        {loadError}
                    </p>
                )}
                {actionError && (
                    <p className='app-page__section--muted' role='alert'>
                        {actionError}
                    </p>
                )}
                <section className='app-page__section'>
                    <h2>Saved flights</h2>
                    {!isAuthenticated ? (
                        <div className='app-page__section--muted'>
                            <p>Log in to see your favorites here.</p>
                        </div>
                    ) : loading ? (
                        <div className='app-page__section--muted'>
                            <p>Loading…</p>
                        </div>
                    ) : favorites.length === 0 && !loadError ? (
                        <div className='app-page__section--muted'>
                            <p>
                                No favorites yet. Search for a flight by tail number and add it to
                                your favorites when logged in.
                            </p>
                        </div>
                    ) : favorites.length > 0 ? (
                        <ul className='flight-list'>
                            {favorites.map((f) => (
                                <li key={String(f.favoriteId)}>
                                    <FavoritesCard
                                        item={f}
                                        onRemove={handleRemove}
                                        onMove={handleMove}
                                        onRename={handleRename}
                                        onSearchTail={onSearchFromCardTitle}
                                    />
                                </li>
                            ))}
                        </ul>
                    ) : null}
                </section>
            </div>
        </div>
    );
}

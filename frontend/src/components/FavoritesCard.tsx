/**
 * FavoritesCard — one row in the saved-favorites list.
 *
 * Expects a {@link FavoriteListItem} from `api.ts` (already normalized after `fetch`). The parent
 * (`Favorites.tsx`) owns all async API calls; this component only invokes callbacks.
 * Title click runs tail search via `registration` / `externalItemId` / `icao24` precedence.
 */
import { useState } from 'react';
import type { FavoriteListItem } from '../api';

/**
 * Builds the string passed to the parent’s tail search (same precedence as the map search bar).
 * Prefer human registration, then backend external id, then ICAO24 hex, then numeric row id.
 */
function searchQueryForItem(item: FavoriteListItem): string {
    const ext = item.externalItemId?.trim();
    if (ext) return ext;
    return String(item.favoriteId);
}

/**
 * Secondary line under the favorite title: show registration and ICAO24 when both differ,
 * else external id or icao-only label, else a fallback `ID …` for bare rows.
 */
function subtitleForItem(item: FavoriteListItem): string {
    const icao = item.externalItemId.trim();
    let subtitle = `ICAO ${icao}`;
    const reg = item.tailNumber?.trim();
    if (reg && icao.toLowerCase() !== reg.toLowerCase()) {
        subtitle = `${reg} · ${subtitle}`;
    }
    if (item.typecode) {
        subtitle = `${subtitle} · ${item.typecode}`;
    }
    return subtitle;
}

/** Props for the FavoritesCard component. */
interface FavoritesCardProps {
    item: FavoriteListItem;
    onRemove?: (favoriteId: string | number) => void | Promise<void>;
    onMove?: (favoriteId: string | number, direction: 'up' | 'down') => void | Promise<void>;
    onRename?: (favoriteId: string | number, name: string) => void | Promise<void>;
    onSearchTail?: (tail: string) => void;
}

/** Renders one favorite row; persistence is delegated to the parent. */
export default function FavoritesCard({
    item,
    onRemove,
    onMove,
    onRename,
    onSearchTail,
}: FavoritesCardProps) {
    const { favoriteId, name, typecode, updatedAt, tailNumber } = item;

    const [isEditingName, setIsEditingName] = useState(false);
    const [editName, setEditName] = useState(name);

    /** Persists rename via `onRename` when the trimmed value changed; always closes edit mode after. */
    async function handleSaveName() {
        const trimmed = editName.trim();
        if (trimmed && trimmed !== name && onRename)
            await Promise.resolve(onRename(favoriteId, trimmed));
        setIsEditingName(false);
    }

    return (
        <article className='favorites-card'>
            <div className='favorites-card__header'>
                {isEditingName ? (
                    <input
                        type='text'
                        className='favorites-card__name-input'
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => {
                            void handleSaveName();
                        }}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter') void handleSaveName();
                        }}
                        autoFocus
                        aria-label='Favorite name'
                    />
                ) : (
                    <button
                        type='button'
                        className='favorites-card__name'
                        onClick={() => onSearchTail?.(searchQueryForItem(item))}
                        title='Search this aircraft'
                    >
                        {name}
                    </button>
                )}
                <div className='favorites-card__id'>{subtitleForItem(item)}</div>
            </div>
            <div className='favorites-card__meta'>
                {updatedAt && (
                    <span className='favorites-card__updated'>
                        Updated {new Date(updatedAt).toLocaleTimeString()} UTC
                    </span>
                )}
                {!tailNumber && !typecode && (
                    <span className='favorites-card__updated' style={{ color: 'red' }}>
                        No metadata
                    </span>
                )}
            </div>
            <div className='favorites-card__actions'>
                {onMove && (
                    <>
                        <button
                            type='button'
                            className='favorites-card__btn favorites-card__btn--arrow'
                            onClick={() => void onMove(favoriteId, 'up')}
                            title='Move up'
                            aria-label='Move up'
                        >
                            ↑
                        </button>
                        <button
                            type='button'
                            className='favorites-card__btn favorites-card__btn--arrow'
                            onClick={() => void onMove(favoriteId, 'down')}
                            title='Move down'
                            aria-label='Move down'
                        >
                            ↓
                        </button>
                    </>
                )}
                {onRename && (
                    <button
                        type='button'
                        className='favorites-card__btn favorites-card__btn--rename'
                        onClick={() => {
                            setEditName(name);
                            setIsEditingName(true);
                        }}
                    >
                        Rename
                    </button>
                )}
                {onRemove && (
                    <button
                        type='button'
                        className='favorites-card__btn favorites-card__btn--remove'
                        onClick={() => void onRemove(favoriteId)}
                    >
                        Remove
                    </button>
                )}
            </div>
        </article>
    );
}

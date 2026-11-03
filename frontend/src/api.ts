/**
 * Frontend API module — all HTTP calls to the Plane Peep backend.
 *
 * ## Base URL and env
 * `BASE_URL` comes from `import.meta.env.VITE_API_URL` (see `normalizeBaseUrl`). If unset,
 * requests default to `http://localhost:8000`. Paths are still chosen here explicitly
 * (e.g. `/api/favorites`); see the backend README for controller details.
 *
 * ## Async behavior
 * Every exported request helper returns a **Promise** built on `fetch`. They resolve to
 * parsed JSON (or typed data) on success and **reject** with an `Error` (often with a
 * `.status` field as `ApiError`) when `!res.ok` or the network fails. UI code should
 * `await` inside `useEffect` IIFEs, `useCallback` handlers, or route loaders and use
 * `try/catch` (or `.catch`) to surface messages — nothing here updates React state by itself.
 *
 * ## Authentication headers
 * Public routes use `defaultHeaders`. Protected routes use {@link withAuthHeaders}, which
 * adds `Authorization: Bearer <token>` when a non-empty JWT is passed. Login/me
 * and favorites follow that pattern where the backend enforces JWT.
 */

/** Normalize base URL: if env is empty or only ":port", use http://localhost:port */
function normalizeBaseUrl(): string {
    const raw = import.meta.env.VITE_API_URL ?? '';
    const s = (typeof raw === 'string' ? raw : '').trim();
    if (!s) return 'http://localhost:8000';
    if (s.startsWith('http://') || s.startsWith('https://')) return s;
    const port = s.startsWith(':') ? s.slice(1) : s;
    return `http://localhost:${port || '8000'}`;
}
export const BASE_URL = normalizeBaseUrl();

/** Default headers for JSON requests. Add Authorization when auth is implemented. */
export const defaultHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
};

/** JSON headers with optional Bearer token for protected routes (e.g. /api/favorites, /api/auth/me). */
export function withAuthHeaders(token?: string | null): Record<string, string> {
    const t = (token ?? '').trim();
    if (!t) return { ...defaultHeaders };
    return {
        ...defaultHeaders,
        Authorization: `Bearer ${t}`,
    };
}

/** Backend AccountController AuthResponse: login and GET /api/auth/me (includes JWT). */
export interface AuthResponse {
    userId: number;
    username: string;
    token?: string | null;
}

/** Successful POST /api/auth/register response: {@code userId} and {@code username} only (no token). */
export interface RegisterResponse {
    userId: number;
    username: string;
}

export interface BoundsParams {
    minLat: number;
    maxLat: number;
    minLon: number;
    maxLon: number;
}

export interface AircraftPosition {
    icao24: string;
    callsign?: string | null;
    originCountry?: string | null;
    lastUpdated?: number | null;
    longitude?: number | null;
    latitude?: number | null;
    altitude?: number | null;
    velocity?: number | null;
    heading?: number | null;
    verticalRate?: number | null;
    // [key: string]: unknown;
    //NOTE the registration field is not provided with the position
}

export interface ApiError extends Error {
    status?: number;
    data?: unknown;
}

/**
 * Canonical shape for one saved favorite after {@link normalizeFavoriteListItem}.
 * Matches plane-oriented fields the Favorites card displays (not airport route anymore).
 */
export interface FavoriteListItem {
    favoriteId: number;
    name: string;
    sortOrder: number;
    /** Backend key for the favorited aircraft (often tail or icao24). */
    externalItemId: string;
    typecode?: string | null;
    tailNumber?: string | null;
    updatedAt: string;
    createdAt: string;
}

/**
 * Reads the first property in `keys` whose value is a non-empty string after trim.
 * Used when normalizing API rows that may spell the same field differently (e.g. `name` vs `display_name`).
 *
 * @param o - One decoded JSON object (already narrowed to a record).
 * @param keys - Property names to try in order; earlier keys win.
 * @returns The first usable string, or `undefined` if none qualify.
 */
function firstNonEmptyString(o: Record<string, unknown>, keys: string[]): string | undefined {
    for (const k of keys) {
        const v = o[k];
        if (v == null) continue;
        const s = String(v).trim();
        if (s !== '') return s;
    }
    return undefined;
}

/**
 * Maps one raw JSON object from GET/POST/PATCH into a {@link FavoriteListItem}.
 *
 * Returns **null** when the object has no recognizable favorite primary key, so `getFavorites`
 * can skip malformed rows instead of crashing the list renderer.
 *
 * @param raw - A single element from a JSON array (or any unknown); arrays and non-objects yield null.
 * @returns A normalized row, or `null` if `raw` is unusable.
 */
export function normalizeFavoriteListItem(raw: unknown): FavoriteListItem | null {
    if (raw === null || typeof raw !== 'object' || Array.isArray(raw)) return null;
    const o = raw as Record<string, unknown>;
    const favoriteId = o.favoriteId;
    if (!favoriteId || typeof favoriteId !== 'number') return null;

    const name = firstNonEmptyString(o, ['name', 'displayName', 'display_name']) ?? 'Favorite';
    const externalItemId = firstNonEmptyString(o, ['externalItemId', 'external_item_id']) ?? null;
    if (!externalItemId) return null;

    const typecode =
        firstNonEmptyString(o, ['typecode', 'aircraftTypeCode', 'aircraft_type_code']) ?? null;

    const tailNumber = firstNonEmptyString(o, ['tailNumber', 'tail_number']) ?? null;
    const updatedAt = firstNonEmptyString(o, ['updatedAt', 'updated_at']) ?? '';
    const createdAt = firstNonEmptyString(o, ['createdAt', 'created_at']) ?? '';

    /** Optional list ordering from backend (`sortOrder` or snake_case equivalent). */
    const sortOrder = o.sortOrder;
    if (typeof sortOrder !== 'number' || Number.isNaN(sortOrder)) return null;

    return {
        favoriteId,
        name,
        sortOrder,
        externalItemId,
        typecode,
        tailNumber,
        updatedAt,
        createdAt,
    };
}

/**
 * A modal that displays
 *
 * @param {object} props
 * @param {boolean} props.show Whether or not the modal is shown
 * @param {function} props.handleClose Function used to hide modal
 * @param {object} props.plane Plane data that is being displayed
 * @returns {JSX.Element}
 */
export type PlaneDetails = {
    icao24: string;
    callsign?: string | null;
    originCountry?: string | null;
    lastUpdated?: number | null;
    registration?: string | null;
    owner?: string | null;
    typecode?: string | null;
    isObscured?: boolean | null;
};

/**
 * GET. Purpose: health check.
 * Backend: mock in MockMasterController; real in HealthController.
 */
export function getHealth(): Promise<unknown> {
    return fetch(`${BASE_URL}/api/health`, {
        method: 'GET',
        headers: defaultHeaders,
    }).then((res) => {
        if (!res.ok) {
            return res.json().then((data) => {
                const err: ApiError = new Error(
                    (data as { error?: string })?.error || res.statusText || 'Health check failed',
                );
                err.status = res.status;
                err.data = data;
                throw err;
            });
        }
        return res.json().catch(() => undefined);
    });
}

/**
 * POST. Purpose: register user. Body: username, password (both required).
 * Backend: AccountController POST /api/auth/register.
 */
export async function postAuthRegister(body: {
    username: string;
    password: string;
}): Promise<RegisterResponse> {
    const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({
            username: body.username ?? '',
            password: body.password ?? '',
        }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
        const err: ApiError = new Error(data.error || res.statusText || 'Registration failed');
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data as RegisterResponse;
}

/**
 * POST. Purpose: login. Body: username, password (both required).
 * Backend: AccountController POST /api/auth/login.
 */
export async function postAuthLogin(body: {
    username: string;
    password: string;
}): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: defaultHeaders,
        body: JSON.stringify({
            username: body.username ?? '',
            password: body.password ?? '',
        }),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
        const err: ApiError = new Error(data.error || res.statusText || 'Login failed');
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data as AuthResponse;
}

/**
 * GET. Purpose: restore session from JWT (Authorization: Bearer).
 * Backend: AccountController GET /api/auth/me.
 */
export async function getAuthMe(token: string): Promise<AuthResponse> {
    const res = await fetch(`${BASE_URL}/api/auth/me`, {
        method: 'GET',
        headers: withAuthHeaders(token),
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
        const err: ApiError = new Error(data.error || res.statusText || 'Session restore failed');
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data as AuthResponse;
}

/**
 * GET. Purpose: aircraft positions in bounding box. Params: minLat, maxLat, minLon, maxLon.
 */
export async function getAircraftPositions(params: BoundsParams): Promise<AircraftPosition[]> {
    const { minLat, maxLat, minLon, maxLon } = params ?? {};
    const q = new URLSearchParams({
        minLat: String(minLat ?? -90),
        maxLat: String(maxLat ?? 90),
        minLon: String(minLon ?? -180),
        maxLon: String(maxLon ?? 180),
    });
    const url = `${BASE_URL}/api/aircraft/positions?${q}`;
    console.log('[api.ts] getAircraftPositions requesting', url);
    const res = await fetch(url, {
        method: 'GET',
        headers: defaultHeaders,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
        const err: ApiError = new Error(
            (data as { error?: string })?.error ||
                res.statusText ||
                'Failed to fetch aircraft positions',
        );
        err.status = res.status;
        err.data = data;
        throw err;
    }
    const list = Array.isArray(data) ? data : [];
    console.log(
        '[api.ts] getAircraftPositions received',
        list.length,
        'planes, sample:',
        list.slice(0, 3).map((p: AircraftPosition) => ({
            id: p.icao24,
            lat: p.latitude,
            lng: p.longitude,
        })),
    );
    return list as AircraftPosition[];
}

/**
 * GET. Purpose: single aircraft metadata.
 */
export async function getAircraftMetadata(icao24: string): Promise<PlaneDetails> {
    console.info(`[api.ts] getAircraftMetadata requesting metadata for ICAO24 ${icao24}`);
    const id = (icao24 ?? '').trim();
    if (!id) {
        const err: ApiError = new Error('icao24 is required');
        err.status = 400;
        throw err;
    }
    const res = await fetch(`${BASE_URL}/api/aircraft/metadata/${encodeURIComponent(id)}`, {
        method: 'GET',
        headers: defaultHeaders,
    });
    const data = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
        const err: ApiError = new Error(
            data.error || res.statusText || 'Failed to fetch aircraft metadata',
        );
        err.status = res.status;
        err.data = data;
        throw err;
    }
    return data as PlaneDetails;
}

/**
 * GET `/api/favorites` — list favorites for the authenticated user.
 *
 * **Async:** awaits `fetch`, parses JSON, normalizes each element (see module header for why).
 * Pass the same JWT string the app stores after login; empty/missing token sends no Bearer
 * header (request will fail if the route is protected).
 *
 * @param token - JWT from session, or null/undefined when logged out.
 * @returns Normalized list; non-array JSON resolves to an empty array.
 */
export async function getFavorites(token?: string | null): Promise<FavoriteListItem[]> {
    const res = await fetch(`${BASE_URL}/api/favorites`, {
        method: 'GET',
        headers: withAuthHeaders(token),
    });
    const data = (await res.json().catch(() => ({}))) as unknown;
    if (!res.ok) {
        const err: ApiError = new Error(
            (data as { error?: string })?.error || res.statusText || 'Failed to fetch favorites',
        );
        err.status = res.status;
        err.data = data;
        throw err;
    }
    if (!Array.isArray(data)) return [];
    const out: FavoriteListItem[] = [];
    for (const row of data) {
        const item = normalizeFavoriteListItem(row);
        if (item) out.push(item);
    }
    return out;
}

/**
 * POST `/api/favorites` — create a favorite. Body shape is backend-defined (e.g. `externalItemId`).
 * Returns a Promise; callers should `await` and handle errors (e.g. duplicate favorite).
 *
 * @param body - JSON-serializable object as required by the backend.
 * @param token - Optional JWT; sent as Bearer when present.
 * @returns Parsed JSON body from the success response (shape is backend-defined).
 */
export function postFavorites(
    body: Record<string, unknown>,
    token?: string | null,
): Promise<unknown> {
    return fetch(`${BASE_URL}/api/favorites`, {
        method: 'POST',
        headers: withAuthHeaders(token),
        body: JSON.stringify(body),
    }).then((res) => {
        if (!res.ok) {
            return res.json().then((data) => {
                const err: ApiError = new Error(
                    (data as { error?: string })?.error ||
                        res.statusText ||
                        'Failed to add favorite',
                );
                err.status = res.status;
                err.data = data;
                throw err;
            });
        }
        return res.json();
    });
}

/**
 * DELETE `/api/favorites/{favoriteId}` — remove by server favorite id (string path segment).
 *
 * @param favoriteId - Primary key string (numeric id coerced by caller if needed).
 * @param token - JWT for Authorization header.
 * @returns Parsed JSON when present; empty object if the server returns 204 with no body.
 */
export function deleteFavorite(favoriteId: string, token?: string | null): Promise<unknown> {
    return fetch(`${BASE_URL}/api/favorites/${encodeURIComponent(favoriteId)}`, {
        method: 'DELETE',
        headers: withAuthHeaders(token),
    }).then((res) => {
        if (!res.ok) {
            return res.json().then((data) => {
                const err: ApiError = new Error(
                    (data as { error?: string })?.error ||
                        res.statusText ||
                        'Failed to delete favorite',
                );
                err.status = res.status;
                err.data = data;
                throw err;
            });
        }
        return res.json().catch(() => ({}));
    });
}

/**
 * PATCH `/api/favorites/{favoriteId}/name` with body `{ name }` — update display label.
 *
 * @param favoriteId - Target row id (number or string; coerced to string in the URL).
 * @param name - New user-visible name.
 * @param token - JWT for Authorization header.
 * @returns Parsed JSON body from the success response.
 */
export function patchFavoriteName(
    favoriteId: string | number,
    name: string,
    token?: string | null,
): Promise<unknown> {
    return fetch(`${BASE_URL}/api/favorites/${encodeURIComponent(String(favoriteId))}/name`, {
        method: 'PATCH',
        headers: withAuthHeaders(token),
        body: JSON.stringify({ name }),
    }).then((res) => {
        if (!res.ok) {
            return res.json().then((data) => {
                const err: ApiError = new Error(
                    (data as { error?: string })?.error ||
                        res.statusText ||
                        'Failed to rename favorite',
                );
                err.status = res.status;
                err.data = data;
                throw err;
            });
        }
        return res.json();
    });
}

/**
 * PATCH `/api/favorites/{favoriteId}/position` with body `{ direction: 'up' | 'down' }` — reorder.
 *
 * @param favoriteId - Row to move (number or string; coerced to string in the URL).
 * @param direction - Swap with neighbor in that direction on the server.
 * @param token - JWT for Authorization header.
 * @returns Parsed JSON body from the success response.
 */
export function patchFavoriteOrder(
    favoriteId: string | number,
    direction: 'up' | 'down',
    token?: string | null,
): Promise<unknown> {
    return fetch(`${BASE_URL}/api/favorites/${encodeURIComponent(String(favoriteId))}/order`, {
        method: 'PATCH',
        headers: withAuthHeaders(token),
        body: JSON.stringify({ direction }),
    }).then((res) => {
        if (!res.ok) {
            return res.json().then((data) => {
                const err: ApiError = new Error(
                    (data as { error?: string })?.error ||
                        res.statusText ||
                        'Failed to reorder favorite',
                );
                err.status = res.status;
                err.data = data;
                throw err;
            });
        }
        return;
    });
}

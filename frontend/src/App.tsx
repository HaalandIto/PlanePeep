import { BrowserRouter, Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { useState, useEffect, useRef, useCallback, forwardRef } from 'react';

import {
    postAuthLogin, // credentials → JWT + user profile
    getAuthMe, // validate stored JWT on load; refresh SessionUser fields
    getAircraftPositions,
    getAircraftMetadata,
} from './api';
/** Shared API types; `AuthResponse` is the payload shape for login, register→login, and GET /auth/me. */
import type { BoundsParams, AircraftPosition, AuthResponse, PlaneDetails } from './api';
import NavigationBar from './components/Navbar';
import LoginPopup from './components/LoginPopup';
import Map, { type MapHandle } from './components/Map';
import Favorites from './pages/Favorites';
import NotFound from './pages/NotFound';
import About from './pages/About';
import Register from './pages/Register';
import './App.css';
import PlaneInfoModal from './components/PlaneInfoModal';

interface HomeProps {
    planeLocationData: AircraftPosition[];
    showPlaneInfo: (icao: string) => void;
    onViewportBoundsChange: (bounds: BoundsParams) => void;
    viewportBounds: BoundsParams | null;
}

/** Defined outside App so its reference is stable across re-renders (avoids map remount on popup state changes). */
const Home = forwardRef<MapHandle, HomeProps>(function Home(
    { planeLocationData, showPlaneInfo, onViewportBoundsChange, viewportBounds },
    ref,
) {
    return (
        <Map
            ref={ref}
            planeLocationData={planeLocationData}
            showPlaneInfo={showPlaneInfo}
            onViewportBoundsChange={onViewportBoundsChange}
            viewportBounds={viewportBounds}
        />
    );
});

const POSITION_FETCH_INTERVAL = 10_000;

/**
 * In-memory session after a successful auth flow or GET /auth/me.
 * `token` is sent as Bearer to favorites and other protected APIs; `null` means treat as logged out.
 */
interface SessionUser {
    userId: number;
    username: string;
    token: string | null;
}

export type AircraftMetadata = (PlaneDetails & AircraftPosition) | null;

/** localStorage key for JWT; survives refresh and new tabs for this origin, cleared on logout or invalid token. */
const AUTH_TOKEN_STORAGE_KEY = 'authToken';

/**
 * Router location state carrying a tail/ICAO query from a non-home page.
 * Consumed on `/` by an effect so search runs after the map route (and `mapRef`) exist.
 */
type AppLocationState = { pendingTailSearch?: string };

/**
 * Holds all app state and routes. Lives **inside** `<BrowserRouter>` so `useNavigate` / `useLocation`
 * are valid (they cannot run in the parent that only renders `<BrowserRouter>`—there is no Router
 * context above that wrapper).
 */
function AppInner() {
    const navigate = useNavigate();
    const location = useLocation();
    /** Prevents double `handleSearchTailNumber` when React Strict Mode runs effects twice with the same `location.state`. */
    const pendingSearchHandledRef = useRef(false);

    const mapRef = useRef<MapHandle | null>(null);
    /** Current account + JWT; `null` when logged out or before hydration finishes with no valid token. */
    const [user, setUser] = useState<SessionUser | null>(null);
    /** When true, the floating login form from the navbar is visible. */
    const [loginPopupOpen, setLoginPopupOpen] = useState(false);
    const [displayPlaneInfo, setDisplayPlaneInfo] = useState(false);
    const [plane, setPlane] = useState<AircraftMetadata>(null);
    const [planeLocationData, setPlaneLocationData] = useState<AircraftPosition[]>([]);
    const viewportBoundsRef = useRef<BoundsParams | null>(null);
    const [viewportBounds, setViewportBounds] = useState<BoundsParams | null>(null);
    /** Error string from the last `handleLogin` failure; shown inside {@link LoginPopup}. */
    const [loginError, setLoginError] = useState('');

    const fetchPositions = useCallback(async () => {
        const bounds = viewportBoundsRef.current;
        if (!bounds) return;
        try {
            const data = await getAircraftPositions(bounds);
            const rawList = Array.isArray(data) ? data : [];
            const listWithMovement: AircraftPosition[] = rawList.map((p) => ({
                ...p,
                speed: p.velocity ?? 0,
                heading: p.heading ?? 0,
            }));
            const MAX_PLANES = 300;
            setPlaneLocationData(listWithMovement.slice(0, MAX_PLANES)); //TODO handle more than max planes case (alert user? cluster on map?)
        } catch {
            // Keep last known positions; Plane uses miss-strikes only on successful responses.
        }
    }, []);

    useEffect(() => {
        const interval = setInterval(() => {
            void fetchPositions();
        }, POSITION_FETCH_INTERVAL);
        return () => clearInterval(interval);
    }, [fetchPositions]);

    const handleViewportBoundsChange = useCallback(
        (bounds: BoundsParams) => {
            viewportBoundsRef.current = bounds;
            setViewportBounds(bounds);
            fetchPositions().catch(() => {});
        },
        [fetchPositions],
    );

    const showPlaneInfo = useCallback(
        async (icao24: string) => {
            try {
                const metadata = await getAircraftMetadata(icao24);
                if (!metadata) {
                    setPlane(null);
                    setDisplayPlaneInfo(false);
                    console.error(`No metadata found for plane ${icao24}`);
                    return;
                }
                // fill in fields from position data
                const position = planeLocationData.find((p) => p.icao24 === icao24);
                if (position) {
                    const merged: AircraftMetadata = { ...metadata, ...position };
                    setPlane(merged);
                } else {
                    setPlane(metadata);
                    console.warn(
                        `Metadata for plane ${icao24} has no matching position data; displaying metadata only:`,
                        metadata,
                    );
                }
                setDisplayPlaneInfo(true);
            } catch {
                setPlane(null);
                setDisplayPlaneInfo(false);
                console.error(`Failed to fetch metadata for plane ${icao24}`);
            }
        },
        [planeLocationData],
    ); // alternative: use a ref for planeLocationData

    /**
     * Navbar / favorite-card tail search: resolves an identifier, then loads metadata via
     * GET /api/aircraft/metadata/{id}. SearchBar uppercases input; ICAO24 from the API is usually
     * lowercase hex, so we never relied on exact string equality.
     *
     * When `location.pathname !== '/'`, the map is not mounted—only `navigate('/', { state })` and
     * return; an effect on `/` clears state and calls this handler again so highlight + metadata run
     * on the home route (same callback as the navbar and `onSearchFromCardTitle`, per plan).
     */
    const handleSearchTailNumber = useCallback(
        (raw: string) => {
            // Ignore whitespace-only submits (SearchBar also guards, but keep safe if called elsewhere).
            const trimmed = raw.trim();
            if (!trimmed) return;

            if (location.pathname !== '/') {
                void navigate('/', { state: { pendingTailSearch: trimmed } });
                return;
            }

            // Normalized forms for matching: tail/registrations are compared uppercase; ICAO24 compared case-insensitively.
            // const upper = trimmed.toUpperCase();
            const lower = trimmed.toLowerCase();

            // Prefer a plane already on the map: match ICAO24 (6 hex) ignoring case.
            const byIcao = planeLocationData.find((p) => (p.icao24 ?? '').toLowerCase() === lower);

            // Build the path segment for /metadata/{id}: local ICAO24 if found; else lowercase hex if input looks like ICAO24; else pass query as-is (backend still returns 200).
            const idForApi =
                byIcao?.icao24 ??
                (/^[0-9a-f]{6}$/i.test(trimmed) ? trimmed.toLowerCase() : trimmed);

            const matchedOnMap = byIcao;
            if (matchedOnMap) {
                mapRef.current?.getPlaneHighlighted(String(matchedOnMap.icao24));
            }

            // Fetch metadata and open the modal (always triggers a network request except empty trim above).
            void showPlaneInfo(idForApi);
        },
        [location.pathname, navigate, planeLocationData, showPlaneInfo],
    );

    /**
     * After navigating to `/` with `pendingTailSearch`, run the real search on the next frame so
     * `Map` can mount and `mapRef` can receive `getPlaneHighlighted`. Clears `location.state` with
     * `replace: true` first so this effect does not loop when `handleSearchTailNumber` re-renders us.
     */
    useEffect(() => {
        if (location.pathname !== '/') {
            pendingSearchHandledRef.current = false;
            return;
        }
        const raw = (location.state as AppLocationState | undefined)?.pendingTailSearch;
        const trimmed = typeof raw === 'string' ? raw.trim() : '';
        if (!trimmed) {
            pendingSearchHandledRef.current = false;
            return;
        }
        if (pendingSearchHandledRef.current) return;
        pendingSearchHandledRef.current = true;
        void navigate({ pathname: '/', search: location.search }, { replace: true, state: {} });
        const runSearch = () => handleSearchTailNumber(trimmed);
        if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(runSearch);
        } else {
            queueMicrotask(runSearch);
        }
    }, [location.pathname, location.state, location.search, navigate, handleSearchTailNumber]);

    /**
     * Single place to turn an {@link AuthResponse} into React state + `localStorage` so every entry
     * point (login, register→login, /auth/me bootstrap) behaves the same.
     *
     * @param auth - Payload from login, register follow-up login, or GET /auth/me.
     */
    const applyAuth = useCallback((auth: AuthResponse) => {
        // Normalize: API may omit `token`; treat as signed-out for storage consistency.
        const token = auth.token ?? null;
        const nextUser: SessionUser = {
            userId: auth.userId,
            username: auth.username,
            token,
        };
        setUser(nextUser);
        // Mirror JWT for the next full page load; drop the key if there is no token so we never reuse a dead session.
        if (token) {
            localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
        } else {
            localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        }
    }, []);

    /**
     * Session bootstrap: read JWT from {@link AUTH_TOKEN_STORAGE_KEY} and confirm it with the server.
     * On success, `applyAuth` restores `user`; on failure, clear storage and `user` so expired tokens do not leave a phantom login.
     */
    useEffect(() => {
        const token = localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
        if (!token) return; // Nothing persisted — skip network; `user` stays null until explicit login.
        let cancelled = false;
        void (async () => {
            try {
                const auth = await getAuthMe(token);
                // Avoid setState after unmount if the user navigates away during the request.
                if (!cancelled) applyAuth(auth);
            } catch {
                // Token invalid or network error: wipe persistence so the next load does not retry a bad JWT indefinitely.
                localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
                if (!cancelled) setUser(null);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [applyAuth]);

    /**
     * Navbar login popup submit: POST credentials, then close the popup on success.
     *
     * @param credentials - Username and password from {@link LoginPopup}.
     */
    async function handleLogin(credentials: { username: string; password: string }) {
        setLoginError('');
        try {
            const auth = await postAuthLogin(credentials);
            applyAuth(auth);
            setLoginPopupOpen(false);
        } catch (err) {
            // Surface API or network message in the popup; user can retry without navigating away.
            setLoginError((err as Error).message || 'Login failed');
        }
    }

    /**
     * Explicit sign-out: remove persisted JWT and clear in-memory session (navbar updates immediately).
     */
    function handleLogout() {
        localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
        setUser(null);
    }

    return (
        <>
            {/* `user` controls account menu vs. Log in; callbacks open modal or clear JWT-backed session. */}
            <NavigationBar
                onSearchTailNumber={handleSearchTailNumber}
                planeLocationData={planeLocationData}
                user={user}
                onLogin={() => setLoginPopupOpen(true)}
                onLogout={handleLogout}
            />

            {/* Auth UI: modal uses controlled error state; `void` avoids a floating Promise from async submit. */}
            <LoginPopup
                isOpen={loginPopupOpen}
                onClose={() => {
                    setLoginPopupOpen(false);
                    setLoginError('');
                }}
                onSubmit={(c) => {
                    void handleLogin(c);
                }}
                error={loginError}
            />

            <Routes>
                <Route
                    path='/'
                    element={
                        <Home
                            ref={mapRef}
                            planeLocationData={planeLocationData}
                            showPlaneInfo={(icao) => {
                                void showPlaneInfo(icao);
                            }}
                            onViewportBoundsChange={handleViewportBoundsChange}
                            viewportBounds={viewportBounds}
                        />
                    }
                />
                <Route
                    path='/favorites'
                    element={
                        <Favorites
                            onSearchFromCardTitle={handleSearchTailNumber}
                            token={
                                user?.token ?? null
                            } /* Bearer for favorites API; null triggers login UX in page */
                            onLogout={handleLogout}
                        />
                    }
                />
                <Route path='/about' element={<About />} />
                {/* Same `applyAuth` as login + bootstrap so register’s follow-up login drops into one session model. */}
                <Route path='/register' element={<Register onAuthSuccess={applyAuth} />} />
                <Route path='*' element={<NotFound />} />
            </Routes>
            <PlaneInfoModal
                show={displayPlaneInfo}
                handleClose={() => setDisplayPlaneInfo(false)}
                plane={plane}
                user={user}
                token={
                    user?.token ?? null
                } /* gated actions (e.g. favorites) use the same JWT as Favorites */
                setLoginPopupOpen={
                    setLoginPopupOpen
                } /* prompt login without leaving the map/modal */
            />
        </>
    );
}

/** Root export: only provides the router; all hooks and UI live in {@link AppInner}. */
export default function App() {
    return (
        <BrowserRouter>
            <AppInner />
        </BrowserRouter>
    );
}

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import Mark from './Mark';
import Plane from './Plane';
import PlaneHighlighter, { type PlaneHighlighterHandle } from './PlaneHighlighter';
import type { BoundsParams } from '../api';

export type MapHandle = PlaneHighlighterHandle;

interface MapProps {
    planeLocationData: import('../api').AircraftPosition[];
    showPlaneInfo: (icao: string) => void;
    onViewportBoundsChange?: (bounds: BoundsParams) => void;
    viewportBounds: BoundsParams | null;
}

let googleMapsScriptLoadingPromise: Promise<void> | null = null;

function loadGoogleMapsScript(
    apiKey: string | undefined,
    mapId: string | undefined,
): Promise<void> {
    if (
        typeof window !== 'undefined' &&
        (window as unknown as { google?: { maps?: { Map?: unknown } } }).google?.maps?.Map
    ) {
        return Promise.resolve();
    }

    if (googleMapsScriptLoadingPromise) {
        return googleMapsScriptLoadingPromise;
    }

    googleMapsScriptLoadingPromise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        const mapIdParam = mapId ? `&map_ids=${mapId}` : '';
        // AdvancedMarkerElement (replaces deprecated Marker); required for Plane.tsx aircraft pins.
        script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey ?? ''}&libraries=marker${mapIdParam}`;
        script.async = true;
        script.defer = true; // This is used to defer the loading of the script until the DOM is fully loaded.
        script.onload = () => resolve();
        script.onerror = () => reject(new Error('Google Maps script failed to load.'));
        document.head.appendChild(script);
    });

    return googleMapsScriptLoadingPromise;
}

const US_BOUNDS = {
    north: 55,
    south: 19,
    west: -138,
    east: -54,
};

const MAP_VIEW_KEY = 'map-view';
const DEFAULT_CENTER = { lat: 43.0731, lng: -89.4012 }; //Madison WI
const DEFAULT_ZOOM = 9;

function loadMapView(): { center: { lat: number; lng: number }; zoom: number } | null {
    try {
        const raw = sessionStorage.getItem(MAP_VIEW_KEY);
        if (!raw) return null;
        const { center, zoom } = JSON.parse(raw) as {
            center?: { lat?: number; lng?: number };
            zoom?: number;
        };
        if (center?.lat != null && center?.lng != null && typeof zoom === 'number') {
            return { center: { lat: center.lat, lng: center.lng }, zoom };
        }
    } catch {
        // ignore
    }
    return null;
}

function saveMapView(center: { lat: () => number; lng: () => number }, zoom: number): void {
    try {
        sessionStorage.setItem(
            MAP_VIEW_KEY,
            JSON.stringify({
                center: { lat: center.lat(), lng: center.lng() },
                zoom,
            }),
        );
    } catch {
        // ignore
    }
}

function latLngBoundsToApi(
    bounds: google.maps.LatLngBounds | undefined | null,
): BoundsParams | null {
    if (!bounds) return null;
    const ne = bounds.getNorthEast();
    const sw = bounds.getSouthWest();
    return {
        minLat: sw.lat(),
        maxLat: ne.lat(),
        minLon: sw.lng(),
        maxLon: ne.lng(),
    };
}

declare global {
    interface Window {
        google?: {
            maps?: {
                Map: new (el: HTMLElement, opts?: object) => google.maps.Map;
                LatLngBounds: unknown;
                ColorScheme?: { DARK?: unknown };
                ControlPosition?: { RIGHT_BOTTOM?: number };
                event?: { clearInstanceListeners?: (instance: unknown) => void };
            };
        };
    }
}

const Map = forwardRef<MapHandle, MapProps>(function Map(
    { planeLocationData, showPlaneInfo, onViewportBoundsChange, viewportBounds },
    ref,
) {
    const mapDivRef = useRef<HTMLDivElement | null>(null);
    const mapInstanceRef = useRef<google.maps.Map | null>(null);
    const mapCleanupRef = useRef<(() => void) | null>(null);
    const onViewportBoundsChangeRef = useRef(onViewportBoundsChange);
    onViewportBoundsChangeRef.current = onViewportBoundsChange;
    const [error, setError] = useState<string | null>(null);
    const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
    const [mapZoom, setMapZoom] = useState<number | null>(null);
    const [highlightIcao24, setHighlightIcao24] = useState<string | null>(null);
    const planeHighlighterRef = useRef<PlaneHighlighterHandle>(null);

    useImperativeHandle(ref, () => ({
        getPlaneHighlighted: (icao24: string) => {
            planeHighlighterRef.current?.getPlaneHighlighted(icao24);
        },
    }));

    useEffect(() => {
        const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
        const mapId = import.meta.env.VITE_GOOGLE_MAP_ID as string | undefined;

        if (!apiKey) {
            setError('API key not found: please set VITE_GOOGLE_MAPS_API_KEY in .env');
            return;
        }

        let isMounted = true;

        const initMap = async () => {
            try {
                await loadGoogleMapsScript(apiKey, mapId);

                if (!isMounted) return;
                if (!mapDivRef.current) return;
                // Prevent double initialization in React StrictMode
                if (mapInstanceRef.current) return;

                const savedView = loadMapView();
                const center = savedView?.center ?? DEFAULT_CENTER;
                const zoom = savedView?.zoom ?? DEFAULT_ZOOM;

                const googleMaps = (
                    window as unknown as { google: { maps: typeof window.google.maps } }
                ).google?.maps;
                if (!googleMaps) return;

                const gm = googleMaps as typeof googleMaps & {
                    importLibrary?: (name: string) => Promise<unknown>;
                };
                if (typeof gm.importLibrary === 'function') {
                    try {
                        await gm.importLibrary('marker');
                    } catch {
                        // Advanced markers optional; Plane.tsx falls back to legacy Marker.
                    }
                }

                const { ControlPosition } = googleMaps;
                const map = new googleMaps.Map(mapDivRef.current, {
                    center,
                    zoom,
                    minZoom: 4,
                    maxZoom: 18,
                    mapId: mapId || undefined,
                    colorScheme: googleMaps.ColorScheme?.DARK,
                    restriction: {
                        latLngBounds: US_BOUNDS,
                        strictBounds: true,
                    },
                    zoomControl: true,
                    zoomControlOptions: { position: ControlPosition?.RIGHT_BOTTOM },
                    mapTypeControl: true,
                    mapTypeControlOptions: { position: ControlPosition?.RIGHT_BOTTOM },
                    fullscreenControl: true,
                    fullscreenControlOptions: { position: ControlPosition?.RIGHT_BOTTOM },
                    scaleControl: true,
                    scaleControlOptions: { position: ControlPosition?.RIGHT_BOTTOM },
                    streetViewControl: false,
                });
                mapInstanceRef.current = map;
                setMapInstance(map);

                const notifyViewportBounds = () => {
                    const cb = onViewportBoundsChangeRef.current;
                    if (!cb) return;
                    const b = map.getBounds();
                    const api = latLngBoundsToApi(b);
                    if (api) cb(api);
                };
                map.addListener('idle', notifyViewportBounds);
                notifyViewportBounds();

                const saveView = () => {
                    const c = map.getCenter();
                    const z = map.getZoom();
                    if (c && z != null) saveMapView(c, z);
                };
                let debounceId: ReturnType<typeof setTimeout> | null = null;
                //Debounce is used to prevent the map from being saved too often.
                const saveViewDebounced = () => {
                    if (debounceId) clearTimeout(debounceId);
                    debounceId = setTimeout(() => {
                        debounceId = null;
                        saveView();
                    }, 300);
                };
                map.addListener('center_changed', saveViewDebounced);
                map.addListener('zoom_changed', saveViewDebounced);
                const handlePageHide = () => saveView();
                window.addEventListener('pagehide', handlePageHide);

                mapCleanupRef.current = () => {
                    if (debounceId) clearTimeout(debounceId);
                    window.removeEventListener('pagehide', handlePageHide);
                    window.google?.maps?.event?.clearInstanceListeners?.(map);
                };
            } catch (err) {
                //TODO: Alert the user that the map failed to load.
                // eslint-disable-next-line no-console
                console.error(err);
                if (isMounted) {
                    setError((err as Error)?.message || 'Map failed to load');
                }
            }
        };

        void initMap();

        return () => {
            isMounted = false;
            mapCleanupRef.current?.();
        };
    }, []);

    useEffect(() => {
        if (!mapInstance) return;
        const googleMaps = (window as unknown as { google?: { maps?: typeof google.maps } }).google
            ?.maps;
        if (!googleMaps) return;

        const readZoom = (logToConsole: boolean) => {
            const z = mapInstance.getZoom();
            if (z == null) return;
            setMapZoom(z);
            if (logToConsole) {
                // eslint-disable-next-line no-console
                console.log('[map] zoom level', z);
            }
        };
        readZoom(true);
        const zListener = mapInstance.addListener('zoom_changed', () => readZoom(true));
        const idleListener = mapInstance.addListener('idle', () => readZoom(false));
        return () => {
            googleMaps.event?.removeListener?.(zListener);
            googleMaps.event?.removeListener?.(idleListener);
        };
    }, [mapInstance]);

    //TODO: add error page instead of this.// redirect to 404
    if (error) {
        return (
            <div
                style={{
                    height: '400px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                {error}
            </div>
        );
    }

    return (
        <div className='map-fullscreen'>
            <div
                ref={mapDivRef}
                style={{
                    width: '100%',
                    height: '100%',
                    background: '#e5e3df',
                }}
            />
            {mapInstance && (
                <>
                    {/* Zoom HUD (kept for debugging; disabled per product request)
                    {mapZoom != null && (
                        <div
                            className='map-zoom-hud'
                            aria-live='polite'
                            title='Google Maps zoom：数值越大越放大，数值越小视野越广'
                        >
                            缩放等级 {mapZoom}
                        </div>
                    )}
                    */}
                    <Mark
                        mapInstance={mapInstance}
                        viewportBounds={viewportBounds}
                        mapZoom={mapZoom}
                    />
                    <Plane
                        mapInstance={mapInstance}
                        planes={planeLocationData}
                        viewportBounds={viewportBounds}
                        showPlaneInfo={showPlaneInfo}
                        highlightIcao24={highlightIcao24}
                        onPlaneClickHighlight={(icao24) => {
                            planeHighlighterRef.current?.getPlaneHighlighted(icao24);
                        }}
                    />
                    <PlaneHighlighter
                        ref={planeHighlighterRef}
                        mapInstance={mapInstance}
                        planes={planeLocationData}
                        setHighlightIcao24={setHighlightIcao24}
                    />
                </>
            )}
        </div>
    );
});

export default Map;

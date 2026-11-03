import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type { AircraftPosition } from '../api';

/**
 * When true, clicking a plane marker triggers highlight (see Plane → onPlaneClickHighlight).
 * Set `VITE_DISABLE_PLANE_CLICK_HIGHLIGHT=true` in `.env` / `.env.local` during development to turn this off.
 */
export const PLANE_CLICK_HIGHLIGHT_ENABLED =
    import.meta.env.VITE_DISABLE_PLANE_CLICK_HIGHLIGHT !== 'true';

export type PlaneHighlighterHandle = {
    /** Center map on this ICAO24, raise zoom to ≥9 if below that, and set highlight for Plane markers/tracks. */
    getPlaneHighlighted: (icao24: string) => void;
};

const MIN_HIGHLIGHT_ZOOM = 10;
const ANIM_MS = 780;
const HIGHLIGHT_COOLDOWN_SEC = 0.8;
/** Global cooldown window for highlight requests (seconds remaining). */
let highlightCooldownRemainingSec = 0;

function easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
}

function normalizeIcao24(raw: string): string {
    return String(raw).trim().toLowerCase();
}

type AnimToken = { cancelled: boolean };

function animateMapToHighlight(
    map: google.maps.Map,
    target: { lat: number; lng: number },
    token: AnimToken,
): void {
    const startCenter = map.getCenter();
    const z0 = map.getZoom();
    if (!startCenter || z0 == null) return;

    const startLat = startCenter.lat();
    const startLng = startCenter.lng();
    const endZ = z0 < MIN_HIGHLIGHT_ZOOM ? MIN_HIGHLIGHT_ZOOM : z0;

    let startTime: number | null = null;

    const step = (now: number) => {
        if (token.cancelled) return;
        if (startTime === null) startTime = now;
        const u = Math.min(1, (now - startTime) / ANIM_MS);
        const e = easeOutCubic(u);
        const lat = startLat + (target.lat - startLat) * e;
        const lng = startLng + (target.lng - startLng) * e;
        const z = z0 + (endZ - z0) * e;
        map.setCenter({ lat, lng });
        map.setZoom(z);
        if (u < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
}

function planeLatLng(plane: AircraftPosition): { lat: number; lng: number } {
    const lat = (plane as AircraftPosition & { latitude?: number }).latitude ?? 0;
    const lng = (plane as AircraftPosition & { longitude?: number }).longitude ?? 0;
    return { lat, lng };
}

interface PlaneHighlighterProps {
    mapInstance: google.maps.Map;
    planes: AircraftPosition[];
    setHighlightIcao24: (icao24: string | null) => void;
}

const PlaneHighlighter = forwardRef<PlaneHighlighterHandle, PlaneHighlighterProps>(
    function PlaneHighlighter(
        { mapInstance, planes, setHighlightIcao24 }: PlaneHighlighterProps,
        ref,
    ) {
        const planesRef = useRef(planes);
        const mapRef = useRef(mapInstance);
        const animTokenRef = useRef<AnimToken | null>(null);

        useEffect(() => {
            planesRef.current = planes;
        }, [planes]);

        useEffect(() => {
            mapRef.current = mapInstance;
        }, [mapInstance]);

        // Per-frame cooldown decay using delta time.
        useEffect(() => {
            let rafId: number | null = null;
            let lastTs: number | null = null;
            const tick = (ts: number) => {
                if (lastTs != null) {
                    const dtSec = (ts - lastTs) / 1000;
                    if (highlightCooldownRemainingSec > 0) {
                        highlightCooldownRemainingSec = Math.max(
                            0,
                            highlightCooldownRemainingSec - dtSec,
                        );
                    }
                }
                lastTs = ts;
                rafId = requestAnimationFrame(tick);
            };
            rafId = requestAnimationFrame(tick);
            return () => {
                if (rafId != null) cancelAnimationFrame(rafId);
            };
        }, []);

        const cancelAnim = useCallback(() => {
            const t = animTokenRef.current;
            if (t) t.cancelled = true;
            animTokenRef.current = null;
        }, []);

        useImperativeHandle(
            ref,
            () => ({
                getPlaneHighlighted(icao24: string) {
                    // Hard gate: only accept one highlight per cooldown window.
                    if (highlightCooldownRemainingSec > 0) return;
                    highlightCooldownRemainingSec = HIGHLIGHT_COOLDOWN_SEC;

                    const id = normalizeIcao24(icao24);
                    if (!id) return;

                    cancelAnim();
                    setHighlightIcao24(id);

                    const map = mapRef.current;
                    const list = planesRef.current;
                    const plane = list.find((p) => String(p.icao24).toLowerCase() === id);
                    if (!plane) return;

                    const { lat, lng } = planeLatLng(plane);
                    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

                    const token: AnimToken = { cancelled: false };
                    animTokenRef.current = token;
                    animateMapToHighlight(map, { lat, lng }, token);
                },
            }),
            [cancelAnim, setHighlightIcao24],
        );

        useEffect(() => {
            return () => cancelAnim();
        }, [cancelAnim, mapInstance]);

        return null;
    },
);

export default PlaneHighlighter;

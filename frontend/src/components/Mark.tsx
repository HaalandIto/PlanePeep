import { useEffect, useMemo, useRef } from 'react';
import airportCsvRaw from '../assets/Airport_Data_Wiki.csv?raw';
import type { BoundsParams } from '../api';

const MARKER_W = 44;
const MARKER_H = 52;
const MARKER_SCALE = 1.2;
/** Anchor at pin tip (map coordinate = airport location). */
const ANCHOR_X = 22;
const ANCHOR_Y = 30;
const PIN_FILL = '#353535';

export type HubRole = 'P-L' | 'P-M' | 'P-S' | 'P-N';

export type AirportMarkerRecord = {
    icao: string;
    iata: string;
    lat: number;
    lng: number;
    title: string;
    role: HubRole;
    /** Annual enplanements from CSV (used when hub role ties). */
    enplanements: number;
};

/**
 * Screen-space separation (px): if map pins are closer than this in projected pixels at the
 * current zoom, treat as overlapping (ground distance threshold shrinks as zoom increases).
 */
const CLOSE_AIRPORT_OVERLAP_PX = 48;

/** P-L always; P-M zoom≥5; P-S zoom≥6; P-N zoom≥7. When zoom unknown, only P-L. */
function airportVisibleAtZoom(role: HubRole, zoom: number | null): boolean {
    if (role === 'P-L') return true;
    if (zoom == null) return false;
    if (role === 'P-M') return zoom >= 5;
    if (role === 'P-S') return zoom >= 6;
    if (role === 'P-N') return zoom >= 7;
    return false;
}

function parseAirportMarkers(csv: string): AirportMarkerRecord[] {
    const lines = csv.split(/\r?\n/).filter((line) => line.length > 0);
    if (lines.length === 0) return [];

    const header = lines[0].split('\t');
    const latIdx = header.indexOf('Lat');
    const lngIdx = header.indexOf('Lng');
    const iataIdx = header.indexOf('IATA');
    const icaoIdx = header.indexOf('ICAO');
    const airportIdx = header.indexOf('Airport');
    const roleIdx = header.indexOf('Role');
    const enplanementsIdx = header.indexOf('Enplanements');
    if (
        latIdx === -1 ||
        lngIdx === -1 ||
        iataIdx === -1 ||
        roleIdx === -1 ||
        icaoIdx === -1 ||
        enplanementsIdx === -1
    )
        return [];

    const out: AirportMarkerRecord[] = [];
    for (let i = 1; i < lines.length; i++) {
        const cells = lines[i].split('\t');
        if (cells.length <= Math.max(latIdx, lngIdx, roleIdx, icaoIdx, enplanementsIdx)) continue;

        const roleRaw = (cells[roleIdx] ?? '').trim();
        if (!/^P-[LMSN]$/.test(roleRaw)) continue;
        const role = roleRaw as HubRole;

        const lat = Number.parseFloat(cells[latIdx] ?? '');
        const lng = Number.parseFloat(cells[lngIdx] ?? '');
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

        const iata = (cells[iataIdx] ?? '')
            .replace(/[^A-Za-z0-9]/g, '')
            .slice(0, 3)
            .toUpperCase();
        if (iata.length !== 3) continue;

        const icao = (cells[icaoIdx] ?? '')
            .replace(/[^A-Za-z0-9]/g, '')
            .slice(0, 4)
            .toUpperCase();

        const title = (cells[airportIdx] ?? iata).trim() || iata;
        const enplanementsRaw = (cells[enplanementsIdx] ?? '').replace(/,/g, '').trim();
        const enplanements = Number.parseInt(enplanementsRaw, 10);
        out.push({
            icao: icao.length >= 3 ? icao : `${iata}-${lat.toFixed(4)}-${lng.toFixed(4)}`,
            iata,
            lat,
            lng,
            title,
            role,
            enplanements: Number.isFinite(enplanements) ? enplanements : 0,
        });
    }
    return out;
}

const AIRPORT_MARKERS = parseAirportMarkers(airportCsvRaw);

function airportInViewport(a: AirportMarkerRecord, b: BoundsParams): boolean {
    return a.lat >= b.minLat && a.lat <= b.maxLat && a.lng >= b.minLon && a.lng <= b.maxLon;
}

/**
 * More southerly (smaller lat, usually toward the bottom of the map) → higher z-index,
 * so overlapping pins stack with the visually lower airport on top.
 */
function airportMarkerZIndex(lat: number, maxZIndex: number): number {
    return maxZIndex + Math.round((90 - lat) * 1000);
}

function roleRank(role: HubRole): number {
    switch (role) {
        case 'P-L':
            return 4;
        case 'P-M':
            return 3;
        case 'P-S':
            return 2;
        case 'P-N':
            return 1;
        default:
            return 0;
    }
}

/** Prefer larger hub class; tie-break by higher enplanements; then ICAO. */
function pickPreferredAirport(a: AirportMarkerRecord, b: AirportMarkerRecord): AirportMarkerRecord {
    const ra = roleRank(a.role);
    const rb = roleRank(b.role);
    if (ra !== rb) return ra > rb ? a : b;
    if (a.enplanements !== b.enplanements) return a.enplanements > b.enplanements ? a : b;
    return a.icao <= b.icao ? a : b;
}

const EARTH_RADIUS_KM = 6371;

function haversineKm(p1: { lat: number; lng: number }, p2: { lat: number; lng: number }): number {
    const dLat = ((p2.lat - p1.lat) * Math.PI) / 180;
    const dLng = ((p2.lng - p1.lng) * Math.PI) / 180;
    const lat1 = (p1.lat * Math.PI) / 180;
    const lat2 = (p2.lat * Math.PI) / 180;
    const h =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * EARTH_RADIUS_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Web Mercator: ground meters per CSS pixel at `latDeg` for Google Maps zoom level. */
function metersPerPixelAtZoom(latDeg: number, zoom: number): number {
    const latRad = (latDeg * Math.PI) / 180;
    return (156543.03392 * Math.cos(latRad)) / Math.pow(2, zoom);
}

/** True if straight-line ground distance is ≤ `maxSeparationPx` projected pixels at `zoom`. */
function closeInViewportPixelSpace(
    a: AirportMarkerRecord,
    b: AirportMarkerRecord,
    maxSeparationPx: number,
    zoom: number,
): boolean {
    const midLat = (a.lat + b.lat) / 2;
    const maxMeters = maxSeparationPx * metersPerPixelAtZoom(midLat, zoom);
    return haversineKm(a, b) * 1000 <= maxMeters;
}

/**
 * Merge airports that overlap in screen space at `zoom`; each component keeps one winner
 * (hub role, then enplanements).
 */
function dedupeCloseAirports(
    airports: AirportMarkerRecord[],
    maxSeparationPx: number,
    zoom: number,
): AirportMarkerRecord[] {
    const n = airports.length;
    if (n <= 1) return airports;

    const parent = Array.from({ length: n }, (_, i) => i);
    function find(x: number): number {
        if (parent[x] !== x) parent[x] = find(parent[x]);
        return parent[x];
    }
    function union(x: number, y: number): void {
        let px = find(x);
        let py = find(y);
        if (px === py) return;
        if (px > py) [px, py] = [py, px];
        parent[py] = px;
    }

    for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
            if (closeInViewportPixelSpace(airports[i], airports[j], maxSeparationPx, zoom))
                union(i, j);
        }
    }

    const clusters = new Map<number, number[]>();
    for (let i = 0; i < n; i++) {
        const r = find(i);
        if (!clusters.has(r)) clusters.set(r, []);
        clusters.get(r)!.push(i);
    }

    const out: AirportMarkerRecord[] = [];
    for (const idxs of clusters.values()) {
        let winner = airports[idxs[0]];
        for (let k = 1; k < idxs.length; k++) {
            winner = pickPreferredAirport(winner, airports[idxs[k]]);
        }
        out.push(winner);
    }
    return out;
}

function airportMarkerIconDataUrl(iata: string): string {
    const code = iata
        .replace(/[^A-Za-z0-9]/g, '')
        .slice(0, 4)
        .toUpperCase();
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${MARKER_W}" height="${MARKER_H}" viewBox="0 0 ${MARKER_W} ${MARKER_H}">
  <path fill="${PIN_FILL}" stroke="#fff" stroke-width="1.25" d="M22 4c-4.9 0-8.8 4-8.8 8.9 0 6.6 8.8 16.7 8.8 16.7s8.8-10.1 8.8-16.7c0-4.9-3.9-8.9-8.8-8.9z"/>
  <circle cx="22" cy="13" r="2.75" fill="#fff"/>
  <text x="22" y="${MARKER_H - 6}" text-anchor="middle" font-size="11.5" font-weight="700" fill="${PIN_FILL}" stroke="#fff" stroke-width="2" paint-order="stroke fill" stroke-linejoin="round" font-family="system-ui,Segoe UI,sans-serif">${code}</text>
</svg>`;
    return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

interface MarkProps {
    mapInstance: google.maps.Map;
    viewportBounds: BoundsParams | null;
    mapZoom: number | null;
}

/**
 * US commercial airports from `Airport_Data_Wiki.csv` (pin + IATA below).
 * Shown only in viewport, with hub role gated by zoom (P-L always; P-M≥5; P-S≥6; P-N≥7).
 * Pairs closer than {@link CLOSE_AIRPORT_OVERLAP_PX} px at the current zoom collapse to the larger hub, then higher enplanements.
 */
export default function Mark({ mapInstance, viewportBounds, mapZoom }: MarkProps) {
    const iconCache = useMemo(() => new Map<string, google.maps.Icon>(), []);
    const markersByIcaoRef = useRef<Map<string, google.maps.Marker>>(new Map());

    useEffect(() => {
        return () => {
            const markersMap = markersByIcaoRef.current;
            for (const m of markersMap.values()) m.setMap(null);
            markersMap.clear();
        };
    }, [mapInstance]);

    useEffect(() => {
        const googleMaps = (window as unknown as { google?: { maps?: typeof google.maps } }).google
            ?.maps;
        if (!googleMaps || !mapInstance) return;

        const scaledW = MARKER_W * MARKER_SCALE;
        const scaledH = MARKER_H * MARKER_SCALE;
        const anchorX = ANCHOR_X * MARKER_SCALE;
        const anchorY = ANCHOR_Y * MARKER_SCALE;

        const getIcon = (iata: string): google.maps.Icon => {
            let icon = iconCache.get(iata);
            if (!icon) {
                icon = {
                    url: airportMarkerIconDataUrl(iata),
                    scaledSize: new googleMaps.Size(scaledW, scaledH),
                    anchor: new googleMaps.Point(anchorX, anchorY),
                };
                iconCache.set(iata, icon);
            }
            return icon;
        };

        const markersMap = markersByIcaoRef.current;

        if (!viewportBounds) {
            for (const m of markersMap.values()) m.setMap(null);
            return;
        }

        const maxZ = googleMaps.Marker.MAX_ZINDEX;

        const visibleFiltered = AIRPORT_MARKERS.filter(
            (a) => airportInViewport(a, viewportBounds) && airportVisibleAtZoom(a.role, mapZoom),
        );
        const zRaw = mapZoom ?? mapInstance.getZoom();
        const zoomForDedupe = typeof zRaw === 'number' && Number.isFinite(zRaw) ? zRaw : 9;
        const visibleDeduped = dedupeCloseAirports(
            visibleFiltered,
            CLOSE_AIRPORT_OVERLAP_PX,
            zoomForDedupe,
        );
        const visibleInDrawOrder = visibleDeduped.sort((a, b) => a.lat - b.lat);

        const visibleKeys = new Set<string>();
        for (const a of visibleInDrawOrder) {
            visibleKeys.add(a.icao);
            const z = airportMarkerZIndex(a.lat, maxZ);
            let marker = markersMap.get(a.icao);
            if (!marker) {
                marker = new googleMaps.Marker({
                    position: { lat: a.lat, lng: a.lng },
                    map: mapInstance,
                    zIndex: z,
                    title: a.title,
                    icon: getIcon(a.iata),
                    clickable: false,
                });
                markersMap.set(a.icao, marker);
            } else {
                marker.setMap(mapInstance);
                marker.setPosition({ lat: a.lat, lng: a.lng });
                marker.setZIndex(z);
            }
        }

        for (const [icao, marker] of markersMap) {
            if (!visibleKeys.has(icao)) marker.setMap(null);
        }
    }, [mapInstance, viewportBounds, mapZoom, iconCache]);

    return null;
}

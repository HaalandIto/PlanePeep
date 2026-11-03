import { useEffect, useRef } from 'react';
import BluePlaneImg from '../assets/Plane/BluePlane.png';
import YellowPlaneImg from '../assets/Plane/YellowPlane.png';
import { PLANE_CLICK_HIGHLIGHT_ENABLED } from './PlaneHighlighter';
import type { AircraftPosition, BoundsParams } from '../api';

/**
 * Plane data structure interface (shared with backend)
 * @typedef {Object} PlaneInfo
 * @property {string|number} id - Unique plane identifier
 * @property {number} lat - Latitude
 * @property {number} lng - Longitude
 * @property {number} [heading] - Heading angle 0–360 (0 = north, 90 = east, clockwise)
 * @property {number} [speed] - Speed in km/h for real-time movement
 * @property {string} [name] - Optional plane name/identifier
 * @property {string} [status] - Optional status string
 * @property {Object} [extra] - Optional extra metadata
 */

const SIZE = 32;
const ANCHOR = SIZE / 2;

//TODO: make plane move faster
/** Advance position by speed and heading. dtHours = elapsed time in hours. */
function advancePosition(
    lat: number,
    lng: number,
    headingDeg: number,
    speedKmh: number,
    dtHours: number,
): { lat: number; lng: number } {
    const distKm = speedKmh * dtHours;
    const headingRad = (headingDeg * Math.PI) / 180;
    const latRad = (lat * Math.PI) / 180;
    const KM_PER_DEG_LAT = 111;
    const dLat = (distKm / KM_PER_DEG_LAT) * Math.cos(headingRad);
    const dLng = (distKm / (KM_PER_DEG_LAT * Math.cos(latRad))) * Math.sin(headingRad);
    return { lat: lat + dLat, lng: lng + dLng };
}

/** Create a rotated icon data URL based on heading */
function createRotatedIconUrl(imgUrl: string, headingDeg = 0): Promise<string> {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = SIZE;
            canvas.height = SIZE;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error('Could not get 2d context'));
                return;
            }
            ctx.translate(ANCHOR, ANCHOR);
            ctx.rotate((headingDeg * Math.PI) / 180);
            ctx.translate(-ANCHOR, -ANCHOR);
            ctx.drawImage(img, 0, 0, SIZE, SIZE);
            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = reject;
        img.src = imgUrl;
    });
}

/**
 * @param {Object} props
 * @param {google.maps.Map | null} props.mapInstance - Google Maps instance
 * @param {PlaneInfo[]} [props.planes] - List of planes to show
 */
const TICK_MS = 100;
const SESSION_STORAGE_KEY = 'flight-tracks';
const TRACK_STROKE_COLOR = '#64b5f6';
const HIGHLIGHT_TRACK_STROKE = 'rgb(239, 240, 39)';
const TRACK_STROKE_WEIGHT = 2;
const POS_EPS = 1e-7;
const TRACK_LOAD_DEFER_MS = 90;
const TRACK_LOAD_BATCH_SIZE = 6;

function latLngNearlyEqual(
    a: { lat: number; lng: number },
    b: { lat: number; lng: number },
    eps = POS_EPS,
): boolean {
    return Math.abs(a.lat - b.lat) <= eps && Math.abs(a.lng - b.lng) <= eps;
}

/** Max points per aircraft track (oldest dropped first from the front). */
/** Successful responses missing a plane still in view: remove after this many misses. */
const MISS_STRIKES_TO_REMOVE = 3;

/**
 * Hard cap on stored vertices after arc-length trim. Must be large enough that a 100 km tail at
 * ~100 ms / tick is not truncated by count (the old 300-point cap ≈ 1 km at ~150 km/h).
 */
const MAX_TRACK_POINTS_SAFETY = 50_000;

function trimTrackPathCountSafetyInPlace(path: { lat: number; lng: number }[]): void {
    const excess = path.length - MAX_TRACK_POINTS_SAFETY;
    if (excess > 0) path.splice(0, excess);
}

function pointInViewport(pos: { lat: number; lng: number }, b: BoundsParams): boolean {
    return pos.lat >= b.minLat && pos.lat <= b.maxLat && pos.lng >= b.minLon && pos.lng <= b.maxLon;
}

//TODO: want track to disappear somehow
function loadTracksFromSession(): Record<string, [number, number][]> {
    try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
        return raw ? (JSON.parse(raw) as Record<string, [number, number][]>) : {};
    } catch {
        return {};
    }
}

function saveTracksToSession(tracksById: Record<string, [number, number][]>): void {
    try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(tracksById));
    } catch {
        // ignore
    }
}

interface PlaneProps {
    mapInstance: google.maps.Map;
    planes: AircraftPosition[];
    viewportBounds: BoundsParams | null;
    showPlaneInfo: (icao: string) => void;
    /** Lowercase ICAO24 hex to show yellow plane + yellow track; null = none. */
    highlightIcao24: string | null;
    /** If set and `PLANE_CLICK_HIGHLIGHT_ENABLED` is true, marker click highlights this ICAO24 first. */
    onPlaneClickHighlight?: (icao24: string) => void;
}

type LatLng = { lat: number; lng: number };

const EARTH_RADIUS_M = 6_371_000;

function haversineMeters(a: LatLng, b: LatLng): number {
    const dLat = ((b.lat - a.lat) * Math.PI) / 180;
    const dLng = ((b.lng - a.lng) * Math.PI) / 180;
    const la1 = (a.lat * Math.PI) / 180;
    const la2 = (b.lat * Math.PI) / 180;
    const h =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) * Math.sin(dLng / 2);
    return 2 * EARTH_RADIUS_M * Math.asin(Math.min(1, Math.sqrt(h)));
}

interface PathArcGeom {
    edgeLensM: number[];
    totalM: number;
}

function computePathArcGeometry(path: LatLng[]): PathArcGeom | null {
    if (path.length < 2) return null;
    const edgeLensM: number[] = [];
    for (let i = 0; i < path.length - 1; i++) {
        edgeLensM.push(haversineMeters(path[i], path[i + 1]));
    }
    const totalM = edgeLensM.reduce((x, y) => x + y, 0);
    return { edgeLensM, totalM: Math.max(totalM, 1e-6) };
}

/** Point on the polyline at arc-length fraction u ∈ [0,1] (0 = oldest, 1 = plane / last vertex). */
function pointAtArcFraction(path: LatLng[], geom: PathArcGeom, u: number): LatLng {
    const uu = Math.max(0, Math.min(1, u));
    const targetM = uu * geom.totalM;
    let acc = 0;
    for (let i = 0; i < geom.edgeLensM.length; i++) {
        const len = geom.edgeLensM[i];
        if (acc + len >= targetM - 1e-9) {
            const t = len > 1e-9 ? (targetM - acc) / len : 1;
            const tc = Math.max(0, Math.min(1, t));
            const a = path[i];
            const b = path[i + 1];
            return {
                lat: a.lat + (b.lat - a.lat) * tc,
                lng: a.lng + (b.lng - a.lng) * tc,
            };
        }
        acc += len;
    }
    return { ...path[path.length - 1] };
}

/**
 * Max geodesic length (Haversine along stored vertices) of the **trail behind the aircraft**:
 * from the oldest kept point → current position (`path[path.length - 1]`). Not from first-ever spawn;
 * whenever total length exceeds this, oldest prefix is cut so only the last 100 km of history remains.
 */
const TRACK_MAX_VISIBLE_ARC_M = 100_000;

/**
 * If arc from oldest point to aircraft exceeds `maxArcM`, drop oldest prefix so the remainder is ≤ `maxArcM`.
 * Always keeps at least two points `[…, aircraft]` so the track never becomes a single vertex (which would hide the line).
 */
function trimTrackPathToMaxArcTailInPlace(path: LatLng[], maxArcM: number): void {
    if (path.length < 2) return;
    const geom = computePathArcGeometry(path);
    if (!geom || geom.totalM <= maxArcM + 0.5) return;

    const walkFromOldestM = geom.totalM - maxArcM;
    let acc = 0;
    for (let i = 0; i < geom.edgeLensM.length; i++) {
        const len = geom.edgeLensM[i];
        const a = path[i];
        const b = path[i + 1];
        if (acc + len >= walkFromOldestM - 1e-9) {
            const t = len > 1e-9 ? (walkFromOldestM - acc) / len : 0;
            const tc = Math.max(0, Math.min(1, t));
            const cut: LatLng = {
                lat: a.lat + (b.lat - a.lat) * tc,
                lng: a.lng + (b.lng - a.lng) * tc,
            };
            const planePt = path[path.length - 1];
            const tail = path.slice(i + 1);
            const dupM = tail.length ? haversineMeters(cut, tail[0]) : Infinity;
            let merged: LatLng[] = dupM < 2 ? tail : [cut, ...tail];
            if (merged.length < 2) {
                merged = [cut, { ...planePt }];
            }
            path.splice(0, path.length, ...merged);
            return;
        }
        acc += len;
    }
}

function trimTrackPointBudgetThenMaxArcInPlace(path: LatLng[]): void {
    trimTrackPathToMaxArcTailInPlace(path, TRACK_MAX_VISIBLE_ARC_M);
    trimTrackPathCountSafetyInPlace(path);
}

/** Sample spacing along visible tail for SVG `d` (screen polyline approximates ground track). */
const TRACK_SVG_SAMPLE_STEP_M = 2_500;
const TRACK_SVG_SAMPLE_SEGMENTS_MAX = 64;

const SVG_NS = 'http://www.w3.org/2000/svg';

function sanitizeTrackGradId(id: string): string {
    return id.replace(/[^a-zA-Z0-9_-]/g, '_');
}

/** Prefer `AdvancedMarkerElement` (`libraries=marker` + mapId); fall back to legacy `Marker`. */
interface PlaneMarkerHandle {
    setPosition(pos: LatLng): void;
    setMap(m: google.maps.Map | null): void;
    setIconFromUrl(url: string): void;
}

function createPlaneMarker(
    googleMaps: typeof google.maps,
    map: google.maps.Map,
    args: { position: LatLng; iconUrl: string; title: string; onClick: () => void },
): PlaneMarkerHandle {
    type AdvInst = {
        map: google.maps.Map | null;
        position?: google.maps.LatLngLiteral | google.maps.LatLng | null;
        addListener(eventName: string, handler: () => void): google.maps.MapsEventListener;
    };
    const AdvMarker = (
        googleMaps as unknown as {
            marker?: { AdvancedMarkerElement?: new (options: object) => AdvInst };
        }
    ).marker?.AdvancedMarkerElement;

    if (AdvMarker) {
        const wrap = document.createElement('div');
        wrap.style.cssText = `width:${SIZE}px;height:${SIZE}px;cursor:pointer;`;
        const img = document.createElement('img');
        img.width = SIZE;
        img.height = SIZE;
        img.alt = '';
        img.src = args.iconUrl;
        img.style.display = 'block';
        wrap.appendChild(img);
        const marker = new AdvMarker({
            map,
            position: args.position,
            content: wrap,
            title: args.title,
            gmpClickable: true,
            /** Match legacy `Marker` + `anchor: Point(ANCHOR, ANCHOR)` (default pin is bottom-center). */
            anchorLeft: '-50%',
            anchorTop: '-50%',
        }) as AdvInst;
        marker.addListener('gmp-click', args.onClick);
        return {
            setPosition(pos) {
                marker.position = pos;
            },
            setMap(m) {
                marker.map = m;
            },
            setIconFromUrl(url) {
                img.src = url;
            },
        };
    }

    const marker = new googleMaps.Marker({
        position: args.position,
        map,
        title: args.title,
        icon: {
            url: args.iconUrl,
            scaledSize: new googleMaps.Size(SIZE, SIZE),
            anchor: new googleMaps.Point(ANCHOR, ANCHOR),
        },
    });
    marker.addListener('click', args.onClick);
    return {
        setPosition(pos) {
            marker.setPosition(pos);
        },
        setMap(m) {
            marker.setMap(m);
        },
        setIconFromUrl(url) {
            marker.setIcon({
                url,
                scaledSize: new googleMaps.Size(SIZE, SIZE),
                anchor: new googleMaps.Point(ANCHOR, ANCHOR),
            });
        },
    };
}

/** Public surface of the lazy-defined overlay (see `createTrackSvgOverlay`). */
interface TrackSvgOverlayHandle {
    setMap(map: google.maps.Map | null): void;
    setTrack(sampledPath: LatLng[], strokeColor: string): void;
}

let trackSvgOverlayCtor: (new (planeId: string) => TrackSvgOverlayHandle) | null = null;

/**
 * `extends google.maps.OverlayView` must not run at module load (bundle can load before Maps script).
 */
function getTrackSvgOverlayClass(
    googleMaps: typeof google.maps,
): new (planeId: string) => TrackSvgOverlayHandle {
    if (trackSvgOverlayCtor) return trackSvgOverlayCtor;

    class TrackSvgOverlayImpl extends googleMaps.OverlayView implements TrackSvgOverlayHandle {
        private readonly gradId: string;
        private container: HTMLDivElement | null = null;
        private pathEl: SVGPathElement | null = null;
        private gradEl: SVGElement | null = null;
        private stopStart: SVGStopElement | null = null;
        private stopEnd: SVGStopElement | null = null;
        private latLngSample: LatLng[] = [];
        private mapListeners: google.maps.MapsEventListener[] = [];

        constructor(planeId: string) {
            super();
            this.gradId = `tgrad_${sanitizeTrackGradId(planeId)}`;
        }

        override onAdd(): void {
            const map = this.getMap();
            if (!map || !('getDiv' in map)) return;
            const pane = this.getPanes()?.overlayLayer;
            if (!pane) return;

            const div = document.createElement('div');
            div.style.cssText =
                'position:absolute;left:0;top:0;width:100%;height:100%;box-sizing:border-box;pointer-events:none;overflow:visible;';

            const svg = document.createElementNS(SVG_NS, 'svg');
            svg.setAttribute('width', '100%');
            svg.setAttribute('height', '100%');
            svg.style.overflow = 'visible';

            const defs = document.createElementNS(SVG_NS, 'defs');
            const lg = document.createElementNS(SVG_NS, 'linearGradient');
            lg.setAttribute('id', this.gradId);
            lg.setAttribute('gradientUnits', 'userSpaceOnUse');

            const s0 = document.createElementNS(SVG_NS, 'stop');
            s0.setAttribute('offset', '0%');
            const s1 = document.createElementNS(SVG_NS, 'stop');
            s1.setAttribute('offset', '100%');
            lg.appendChild(s0);
            lg.appendChild(s1);
            defs.appendChild(lg);

            const pathEl = document.createElementNS(SVG_NS, 'path');
            pathEl.setAttribute('fill', 'none');
            pathEl.setAttribute('stroke', `url(#${this.gradId})`);
            pathEl.setAttribute('stroke-width', String(TRACK_STROKE_WEIGHT));
            pathEl.setAttribute('stroke-linecap', 'round');
            pathEl.setAttribute('stroke-linejoin', 'round');

            svg.appendChild(defs);
            svg.appendChild(pathEl);
            div.appendChild(svg);

            pane.appendChild(div);

            this.mapListeners = [
                googleMaps.event.addListener(map, 'zoom_changed', () => this.paint()),
                googleMaps.event.addListener(map, 'bounds_changed', () => this.paint()),
            ];

            this.container = div;
            this.pathEl = pathEl;
            this.gradEl = lg;
            this.stopStart = s0;
            this.stopEnd = s1;
        }

        override onRemove(): void {
            for (const lis of this.mapListeners) {
                googleMaps.event.removeListener(lis);
            }
            this.mapListeners = [];
            this.container?.remove();
            this.container = null;
            this.pathEl = null;
            this.gradEl = null;
            this.stopStart = null;
            this.stopEnd = null;
        }

        override draw(): void {
            this.paint();
        }

        setTrack(sampledPath: LatLng[], strokeColor: string): void {
            this.latLngSample = sampledPath;
            this.stopStart?.setAttribute('stop-color', strokeColor);
            this.stopEnd?.setAttribute('stop-color', strokeColor);
            // Track starts at the aircraft (head) and fades toward the tail.
            this.stopStart?.setAttribute('stop-opacity', '1');
            this.stopEnd?.setAttribute('stop-opacity', '0');
            this.schedulePaint(0);
        }

        private schedulePaint(attempt: number): void {
            if (this.getProjection()) {
                this.paint();
                return;
            }
            if (attempt > 40 || !this.getMap()) return;
            requestAnimationFrame(() => this.schedulePaint(attempt + 1));
        }

        private paint(): void {
            const proj = this.getProjection();
            const map = this.getMap();
            if (!map || !('getDiv' in map)) return;
            const mapDiv = map.getDiv();
            if (
                !proj ||
                !mapDiv ||
                !this.pathEl ||
                !this.gradEl ||
                !this.stopStart ||
                !this.stopEnd
            )
                return;

            if (this.latLngSample.length < 2) {
                this.pathEl.setAttribute('d', '');
                return;
            }

            const w = mapDiv.clientWidth;
            const h = mapDiv.clientHeight;
            if (this.container) {
                this.container.style.width = `${w}px`;
                this.container.style.height = `${h}px`;
            }
            const svg = this.pathEl.ownerSVGElement;
            if (svg) {
                svg.setAttribute('width', String(w));
                svg.setAttribute('height', String(h));
                svg.setAttribute('viewBox', `0 0 ${w} ${h}`);
            }

            const pts: google.maps.Point[] = [];
            for (const ll of this.latLngSample) {
                const p = proj.fromLatLngToDivPixel(new googleMaps.LatLng(ll.lat, ll.lng));
                if (p) pts.push(p);
            }
            if (pts.length < 2) {
                this.pathEl.setAttribute('d', '');
                return;
            }
            let d = `M ${pts[0].x} ${pts[0].y}`;
            for (let i = 1; i < pts.length; i++) {
                d += ` L ${pts[i].x} ${pts[i].y}`;
            }
            this.pathEl.setAttribute('d', d);

            const p0 = proj.fromLatLngToDivPixel(
                new googleMaps.LatLng(this.latLngSample[0].lat, this.latLngSample[0].lng),
            );
            const p1 = proj.fromLatLngToDivPixel(
                new googleMaps.LatLng(
                    this.latLngSample[this.latLngSample.length - 1].lat,
                    this.latLngSample[this.latLngSample.length - 1].lng,
                ),
            );
            if (!p0 || !p1) return;

            this.gradEl.setAttribute('x1', String(p0.x));
            this.gradEl.setAttribute('y1', String(p0.y));
            this.gradEl.setAttribute('x2', String(p1.x));
            this.gradEl.setAttribute('y2', String(p1.y));
        }
    }

    trackSvgOverlayCtor = TrackSvgOverlayImpl;
    return TrackSvgOverlayImpl;
}

function createTrackSvgOverlay(
    googleMaps: typeof google.maps,
    planeId: string,
): TrackSvgOverlayHandle {
    const Ctor = getTrackSvgOverlayClass(googleMaps);
    return new Ctor(planeId);
}

interface TrackEntry {
    overlay: TrackSvgOverlayHandle;
    path: LatLng[];
}

/**
 * LatLng samples for SVG `d`. Stored `path` is already trimmed to ≤100 km behind the plane.
 * The rendered order is head -> tail: the first sample is the live aircraft position, and the
 * last sample is the oldest retained point (or interpolated 100 km trim point).
 */
function sampleVisibleTrackForSvg(path: LatLng[], planeEnd?: LatLng): LatLng[] {
    if (path.length < 1) return [];
    if (path.length === 1) {
        // First API snapshot: draw a live connector from aircraft(head) to initial API point(tail).
        const tail = path[0];
        const head = planeEnd ?? tail;
        if (latLngNearlyEqual(head, tail)) return [];
        return [
            { lat: head.lat, lng: head.lng },
            { lat: tail.lat, lng: tail.lng },
        ];
    }
    const geom = computePathArcGeometry(path);
    if (!geom) return [];

    const visibleM = Math.min(geom.totalM, TRACK_MAX_VISIBLE_ARC_M);
    const uMin =
        geom.totalM > TRACK_MAX_VISIBLE_ARC_M ? 1 - TRACK_MAX_VISIBLE_ARC_M / geom.totalM : 0;
    const span = 1 - uMin;
    if (span <= 1e-12) return [];

    let segCount = Math.ceil(visibleM / TRACK_SVG_SAMPLE_STEP_M);
    segCount = Math.max(2, Math.min(TRACK_SVG_SAMPLE_SEGMENTS_MAX, segCount));

    const out: LatLng[] = [];
    for (let k = 0; k <= segCount; k++) {
        const t = k / segCount;
        const u = uMin + span * t;
        out.push(pointAtArcFraction(path, geom, u));
    }
    out.reverse();
    const head = planeEnd ?? path[path.length - 1];
    if (out.length && head) out[0] = { lat: head.lat, lng: head.lng };
    return out;
}

function disposeTrackOverlay(overlay: TrackSvgOverlayHandle): void {
    overlay.setMap(null);
}

function rebuildTrackSvg(entry: TrackEntry, strokeColor: string, planePos?: LatLng): void {
    const end = planePos ?? (entry.path.length ? entry.path[entry.path.length - 1] : undefined);
    const sampled = sampleVisibleTrackForSvg(entry.path, end);
    entry.overlay.setTrack(sampled, strokeColor);
}

function planeLatLng(plane: AircraftPosition): { lat: number; lng: number } {
    const lat = (plane as AircraftPosition & { latitude?: number }).latitude ?? 0;
    const lng = (plane as AircraftPosition & { longitude?: number }).longitude ?? 0;
    return { lat, lng };
}

function isHighlightedId(markerId: string, highlightIcao24: string | null): boolean {
    if (highlightIcao24 == null) return false;
    return markerId.toLowerCase() === highlightIcao24.toLowerCase();
}

export default function Plane({
    mapInstance,
    planes,
    viewportBounds,
    showPlaneInfo,
    highlightIcao24,
    onPlaneClickHighlight,
}: PlaneProps) {
    const showPlaneInfoRef = useRef(showPlaneInfo);
    showPlaneInfoRef.current = showPlaneInfo;
    const onPlaneClickHighlightRef = useRef(onPlaneClickHighlight);
    onPlaneClickHighlightRef.current = onPlaneClickHighlight;
    const viewportBoundsRef = useRef(viewportBounds);
    viewportBoundsRef.current = viewportBounds;
    const highlightIcao24Ref = useRef(highlightIcao24);
    highlightIcao24Ref.current = highlightIcao24;
    const prevHighlightIcao24Ref = useRef<string | null>(null);

    /** Incremented on map user gestures (click / zoom / pan / wheel) to abort in-flight marker work. */
    const markerInteractionGenRef = useRef(0);
    const planesRef = useRef(planes ?? []);
    planesRef.current = planes ?? [];
    const mapInstanceRef = useRef(mapInstance);
    mapInstanceRef.current = mapInstance;
    /** Serialized queue for adding/updating markers after idle or planes sync. */
    const markerLoadInFlightRef = useRef(false);
    const markerLoadPendingRef = useRef(false);
    const queueMarkerLoadRef = useRef<(() => void) | null>(null);

    const markersByIdRef = useRef<Map<string, PlaneMarkerHandle>>(new Map());
    const polylinesByIdRef = useRef<Map<string, TrackEntry>>(new Map());
    const positionsByIdRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
    /** Last API position already applied; duplicate polls skip marker/path updates (DR keeps ref between polls). */
    const lastApiPosByIdRef = useRef<Map<string, { lat: number; lng: number }>>(new Map());
    const planeDataByIdRef = useRef<Map<string, AircraftPosition>>(new Map());
    /** Paths for aircraft no longer in the API list; track overlay is off map but history is kept. */
    const hiddenTrackPathsByIdRef = useRef<Map<string, { lat: number; lng: number }[]>>(new Map());
    /** Consecutive successful fetches that omitted this id while it was still in view. */
    const missStrikesByIdRef = useRef<Map<string, number>>(new Map());

    const lastTickRef = useRef<number | null>(null);
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const saveTracksNowRef = useRef<(() => void) | null>(null);
    const handleBeforeUnloadRef = useRef<(() => void) | null>(null);
    /** Lower-priority jobs (priority 0): create/rebuild non-highlighted track overlays. */
    const deferredTrackJobsRef = useRef<Map<string, () => void>>(new Map());
    const deferredTrackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const saveTracksNow = () => {
        const tracksById: Record<string, [number, number][]> = {};
        for (const [id, entry] of polylinesByIdRef.current) {
            const path = entry?.path ?? [];
            if (path.length) tracksById[id] = path.map((p) => [p.lat, p.lng]);
        }
        for (const [id, path] of hiddenTrackPathsByIdRef.current) {
            if (path.length) tracksById[id] = path.map((p) => [p.lat, p.lng]);
        }
        saveTracksToSession(tracksById);
    };
    saveTracksNowRef.current = saveTracksNow;

    const scheduleSave = () => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(saveTracksNow, 500);
    };

    const cancelDeferredTrackJobs = () => {
        deferredTrackJobsRef.current.clear();
        if (deferredTrackTimerRef.current) {
            clearTimeout(deferredTrackTimerRef.current);
            deferredTrackTimerRef.current = null;
        }
    };

    const scheduleDeferredTrackDrain = () => {
        if (deferredTrackTimerRef.current) return;
        deferredTrackTimerRef.current = setTimeout(() => {
            deferredTrackTimerRef.current = null;
            let left = TRACK_LOAD_BATCH_SIZE;
            const iterator = deferredTrackJobsRef.current.entries();
            while (left > 0) {
                const next = iterator.next();
                if (next.done) break;
                const [id, job] = next.value;
                deferredTrackJobsRef.current.delete(id);
                job();
                left--;
            }
            if (deferredTrackJobsRef.current.size > 0) {
                scheduleDeferredTrackDrain();
            }
        }, TRACK_LOAD_DEFER_MS);
    };

    /** User map interaction preempts marker icon generation; map `idle` resumes the queue. */
    useEffect(() => {
        if (!mapInstance || !(window as unknown as { google?: { maps?: unknown } }).google?.maps)
            return;
        const googleMaps = (window as unknown as { google: { maps: typeof window.google.maps } })
            .google?.maps;
        if (!googleMaps) return;

        const bumpInteractionGeneration = () => {
            markerInteractionGenRef.current += 1;
            // User interactions (priority 20) preempt deferred track work (priority 0).
            cancelDeferredTrackJobs();
        };

        const listeners: google.maps.MapsEventListener[] = [
            googleMaps.event.addListener(mapInstance, 'click', bumpInteractionGeneration),
            googleMaps.event.addListener(mapInstance, 'zoom_changed', bumpInteractionGeneration),
            googleMaps.event.addListener(mapInstance, 'dragstart', bumpInteractionGeneration),
        ];

        const mapDiv = mapInstance.getDiv();
        const onWheel = () => bumpInteractionGeneration();
        mapDiv.addEventListener('wheel', onWheel, { passive: true });

        let idleDebounce: ReturnType<typeof setTimeout> | null = null;
        const idleListener = googleMaps.event.addListener(mapInstance, 'idle', () => {
            if (idleDebounce) clearTimeout(idleDebounce);
            idleDebounce = setTimeout(() => {
                idleDebounce = null;
                queueMarkerLoadRef.current?.();
            }, 140);
        });

        return () => {
            for (const lis of listeners) {
                googleMaps.event.removeListener(lis);
            }
            googleMaps.event.removeListener(idleListener);
            mapDiv.removeEventListener('wheel', onWheel);
            if (idleDebounce) clearTimeout(idleDebounce);
        };
    }, [mapInstance]);

    /** Tick: dead-reckoning for visible aircraft only. */
    useEffect(() => {
        if (!mapInstance || !(window as unknown as { google?: { maps?: unknown } }).google?.maps)
            return;

        lastTickRef.current = Date.now();

        const handleBeforeUnload = () => saveTracksNowRef.current?.();
        handleBeforeUnloadRef.current = handleBeforeUnload;
        window.addEventListener('pagehide', handleBeforeUnload);

        intervalRef.current = setInterval(() => {
            if (!(window as unknown as { google?: { maps?: unknown } }).google?.maps) return;

            const now = Date.now();
            const prev = lastTickRef.current ?? now;
            const dtHours = (now - prev) / (1000 * 3600);
            lastTickRef.current = now;

            for (const id of markersByIdRef.current.keys()) {
                const plane = planeDataByIdRef.current.get(id);
                if (!plane) continue;
                const speed = (plane as AircraftPosition & { speed?: number }).speed ?? 0;
                const heading = (plane as AircraftPosition & { heading?: number }).heading ?? 0;
                const pos = positionsByIdRef.current.get(id);
                if (!pos) continue;

                if (speed > 0) {
                    const next = advancePosition(pos.lat, pos.lng, heading, speed, dtHours);
                    positionsByIdRef.current.set(id, next);
                    markersByIdRef.current.get(id)?.setPosition({
                        lat: next.lat,
                        lng: next.lng,
                    });

                    const entry = polylinesByIdRef.current.get(id);
                    if (entry) {
                        // Keep track vertices API-driven; between polls only render a live connector.
                        const strokeColor = isHighlightedId(id, highlightIcao24Ref.current)
                            ? HIGHLIGHT_TRACK_STROKE
                            : TRACK_STROKE_COLOR;
                        rebuildTrackSvg(entry, strokeColor, next);
                    }
                }
            }
            scheduleSave();
        }, TICK_MS);

        return () => {
            const fn = handleBeforeUnloadRef.current;
            if (fn) window.removeEventListener('pagehide', fn);
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            cancelDeferredTrackJobs();
            saveTracksNowRef.current?.();

            for (const m of markersByIdRef.current.values()) {
                m.setMap(null);
            }
            markersByIdRef.current.clear();
            for (const entry of polylinesByIdRef.current.values()) {
                disposeTrackOverlay(entry.overlay);
            }
            polylinesByIdRef.current.clear();
            positionsByIdRef.current.clear();
            lastApiPosByIdRef.current.clear();
            planeDataByIdRef.current.clear();
            hiddenTrackPathsByIdRef.current.clear();
            missStrikesByIdRef.current.clear();
        };
    }, [mapInstance]);

    /** Diff API payload against maps: update in place, hide removed tracks, add new markers. */
    useEffect(() => {
        if (!mapInstance || !(window as unknown as { google?: { maps?: unknown } }).google?.maps)
            return;

        const googleMaps = (window as unknown as { google: { maps: typeof window.google.maps } })
            .google?.maps;
        if (!googleMaps) return;

        let cancelled = false;

        const newIds = new Set((planes ?? []).map((p) => String(p.icao24)));
        const markersMap = markersByIdRef.current;
        const polyMap = polylinesByIdRef.current;

        for (const id of newIds) {
            missStrikesByIdRef.current.delete(id);
        }

        // --- disappeared: remove marker, hide polyline, keep path in hiddenTrackPathsByIdRef ---
        for (const id of [...markersMap.keys()]) {
            if (newIds.has(id)) continue;

            const pos = positionsByIdRef.current.get(id);
            const boundsNow = viewportBoundsRef.current;
            let removeNow = true;
            if (boundsNow && pos && pointInViewport(pos, boundsNow)) {
                const nextStrike = (missStrikesByIdRef.current.get(id) ?? 0) + 1;
                missStrikesByIdRef.current.set(id, nextStrike);
                if (nextStrike < MISS_STRIKES_TO_REMOVE) removeNow = false;
            }

            if (!removeNow) continue;

            missStrikesByIdRef.current.delete(id);
            deferredTrackJobsRef.current.delete(id);
            markersMap.get(id)?.setMap(null);
            markersMap.delete(id);
            const entry = polyMap.get(id);
            if (entry) {
                disposeTrackOverlay(entry.overlay);
                const hiddenPath = [...entry.path];
                trimTrackPointBudgetThenMaxArcInPlace(hiddenPath);
                hiddenTrackPathsByIdRef.current.set(id, hiddenPath);
                polyMap.delete(id);
            }
            positionsByIdRef.current.delete(id);
            lastApiPosByIdRef.current.delete(id);
            planeDataByIdRef.current.delete(id);
        }

        // --- existing: only position + path (+ motion data for tick) ---
        for (const plane of planes ?? []) {
            const id = String(plane.icao24);
            if (!markersMap.has(id)) continue;

            planeDataByIdRef.current.set(id, plane);
            const pos = planeLatLng(plane);
            const prevApi = lastApiPosByIdRef.current.get(id);
            if (prevApi && latLngNearlyEqual(prevApi, pos)) {
                continue;
            }
            lastApiPosByIdRef.current.set(id, { ...pos });

            positionsByIdRef.current.set(id, pos);
            markersMap.get(id)?.setPosition(pos);

            const entry = polyMap.get(id);
            if (entry) {
                const last = entry.path[entry.path.length - 1];
                if (
                    !last ||
                    Math.abs(last.lat - pos.lat) > POS_EPS ||
                    Math.abs(last.lng - pos.lng) > POS_EPS
                ) {
                    entry.path.push(pos);
                    trimTrackPointBudgetThenMaxArcInPlace(entry.path);
                }
                const strokeColor = isHighlightedId(id, highlightIcao24Ref.current)
                    ? HIGHLIGHT_TRACK_STROKE
                    : TRACK_STROKE_COLOR;
                rebuildTrackSvg(entry, strokeColor, pos);
            }
        }

        // --- new aircraft (async icons; user map gestures bump markerInteractionGenRef and abort mid-await) ---
        const queueMarkerLoad = () => {
            if (markerLoadInFlightRef.current) {
                markerLoadPendingRef.current = true;
                return;
            }
            markerLoadInFlightRef.current = true;
            void (async () => {
                try {
                    const markersMapInner = markersByIdRef.current;
                    const polyMapInner = polylinesByIdRef.current;
                    const planesList = planesRef.current ?? [];
                    const tokenSnapshot = markerInteractionGenRef.current;

                    const toAddInner = planesList.filter(
                        (p) => !markersMapInner.has(String(p.icao24)),
                    );
                    if (!toAddInner.length) {
                        scheduleSave();
                        return;
                    }

                    const savedSession = loadTracksFromSession();
                    const iconUrls: string[] = [];
                    for (let i = 0; i < toAddInner.length; i++) {
                        if (cancelled || markerInteractionGenRef.current !== tokenSnapshot) {
                            return;
                        }
                        const p = toAddInner[i];
                        const pid = String(p.icao24);
                        const useYellow = isHighlightedId(pid, highlightIcao24Ref.current);
                        const url = await createRotatedIconUrl(
                            useYellow ? YellowPlaneImg : BluePlaneImg,
                            (p as AircraftPosition & { heading?: number }).heading ?? 0,
                        );
                        iconUrls.push(url);
                    }

                    if (cancelled || markerInteractionGenRef.current !== tokenSnapshot) {
                        return;
                    }

                    toAddInner.forEach((plane, i) => {
                        if (cancelled || markerInteractionGenRef.current !== tokenSnapshot) return;
                        const id = String(plane.icao24);
                        if (markersByIdRef.current.has(id)) return;

                        const startPos = planeLatLng(plane);
                        const fromHidden = hiddenTrackPathsByIdRef.current.get(id);
                        const saved = savedSession[id];
                        let path: { lat: number; lng: number }[];

                        if (fromHidden?.length) {
                            path = fromHidden.map((pt) => ({ ...pt }));
                            hiddenTrackPathsByIdRef.current.delete(id);
                        } else if (saved?.length) {
                            path = saved.map(([la, ln]) => ({ lat: la, lng: ln }));
                        } else {
                            path = [];
                        }

                        const lastPt = path[path.length - 1];
                        if (!lastPt) {
                            path.push({ ...startPos });
                        } else if (
                            Math.abs(lastPt.lat - startPos.lat) > POS_EPS ||
                            Math.abs(lastPt.lng - startPos.lng) > POS_EPS
                        ) {
                            path.push({ ...startPos });
                        } else {
                            path[path.length - 1] = { ...startPos };
                        }
                        trimTrackPointBudgetThenMaxArcInPlace(path);

                        positionsByIdRef.current.set(id, { ...startPos });
                        lastApiPosByIdRef.current.set(id, { ...startPos });
                        planeDataByIdRef.current.set(id, plane);

                        const trackHi = isHighlightedId(id, highlightIcao24Ref.current);
                        const strokeColor = trackHi ? HIGHLIGHT_TRACK_STROKE : TRACK_STROKE_COLOR;
                        const marker = createPlaneMarker(googleMaps, mapInstance, {
                            position: startPos,
                            iconUrl: iconUrls[i],
                            title:
                                (plane as AircraftPosition & { name?: string }).name ??
                                `Plane ${plane.icao24}`,
                            onClick: () => {
                                const icao = String(plane.icao24);
                                if (PLANE_CLICK_HIGHLIGHT_ENABLED) {
                                    onPlaneClickHighlightRef.current?.(icao);
                                }
                                showPlaneInfoRef.current(plane.icao24);
                            },
                        });
                        markersByIdRef.current.set(id, marker);
                        const buildTrackOverlay = () => {
                            if (
                                cancelled ||
                                markerInteractionGenRef.current !== tokenSnapshot ||
                                !markersByIdRef.current.has(id) ||
                                polyMapInner.has(id)
                            ) {
                                return;
                            }
                            const overlay = createTrackSvgOverlay(googleMaps, id);
                            overlay.setMap(mapInstance);
                            const entry: TrackEntry = { overlay, path };
                            rebuildTrackSvg(entry, strokeColor, startPos);
                            polyMapInner.set(id, entry);
                        };
                        if (trackHi) {
                            // Highlight request: plane + track both stay high-priority.
                            buildTrackOverlay();
                        } else {
                            // Normal tracks defer behind airports and planes.
                            deferredTrackJobsRef.current.set(id, buildTrackOverlay);
                            scheduleDeferredTrackDrain();
                        }
                    });

                    scheduleSave();
                } finally {
                    markerLoadInFlightRef.current = false;
                    if (markerLoadPendingRef.current) {
                        markerLoadPendingRef.current = false;
                        queueMarkerLoad();
                    }
                }
            })();
        };

        queueMarkerLoadRef.current = queueMarkerLoad;
        queueMarkerLoad();

        return () => {
            cancelled = true;
            queueMarkerLoadRef.current = null;
        };
    }, [mapInstance, planes]);

    /** Swap blue/yellow icons and track colors when highlight changes or headings refresh. */
    useEffect(() => {
        if (!mapInstance || !(window as unknown as { google?: { maps?: unknown } }).google?.maps)
            return;

        const googleMaps = (window as unknown as { google: { maps: typeof window.google.maps } })
            .google?.maps;
        if (!googleMaps) return;

        let cancelled = false;
        const markersMap = markersByIdRef.current;
        const polyMap = polylinesByIdRef.current;

        if (highlightIcao24) {
            const hid = highlightIcao24.toLowerCase();
            const pending = deferredTrackJobsRef.current.get(hid);
            if (pending) {
                deferredTrackJobsRef.current.delete(hid);
                pending();
            }
        }

        void (async () => {
            const highlightedId = highlightIcao24 ? highlightIcao24.toLowerCase() : null;
            const prevHighlightedId = prevHighlightIcao24Ref.current;
            prevHighlightIcao24Ref.current = highlightedId;

            // Absolute priority path: new highlight first, then previous highlight reset.
            const topPriorityIds = [
                highlightedId,
                prevHighlightedId && prevHighlightedId !== highlightedId ? prevHighlightedId : null,
            ].filter((id): id is string => Boolean(id));

            for (const id of topPriorityIds) {
                const plane = planeDataByIdRef.current.get(id);
                const marker = markersMap.get(id);
                if (!plane || !marker) continue;
                const isTopHi = id === highlightedId;
                const heading = (plane as AircraftPosition & { heading?: number })?.heading ?? 0;
                try {
                    const iconUrl = await createRotatedIconUrl(
                        isTopHi ? YellowPlaneImg : BluePlaneImg,
                        heading,
                    );
                    if (cancelled) return;
                    marker.setIconFromUrl(iconUrl);
                    const entry = polyMap.get(id);
                    if (entry) {
                        const pos = positionsByIdRef.current.get(id);
                        rebuildTrackSvg(
                            entry,
                            isTopHi ? HIGHLIGHT_TRACK_STROKE : TRACK_STROKE_COLOR,
                            pos ?? undefined,
                        );
                    }
                } catch {
                    // ignore icon generation failures
                }
            }

            // Intentionally skip full marker traversal:
            // highlight changes should only update the new/previous highlighted aircraft.
        })();

        return () => {
            cancelled = true;
        };
    }, [mapInstance, highlightIcao24, planes]);

    return null;
}

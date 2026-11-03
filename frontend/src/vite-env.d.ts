/// <reference types="vite/client" />
/// <reference types="@types/google.maps" />

declare module '*.png' {
    const src: string;
    export default src;
}

declare module '*.jpg' {
    const src: string;
    export default src;
}

declare module '*.svg' {
    const src: string;
    export default src;
}

declare module '*.csv?raw' {
    const content: string;
    export default content;
}

interface ImportMetaEnv {
    readonly VITE_API_URL?: string;
    readonly VITE_GOOGLE_MAPS_API_KEY?: string;
    readonly VITE_GOOGLE_MAP_ID?: string;
    /** When `'true'`, plane marker clicks do not call getPlaneHighlighted (dev convenience). */
    readonly VITE_DISABLE_PLANE_CLICK_HIGHLIGHT?: string;
}

interface ImportMeta {
    readonly env: ImportMetaEnv;
}

// Paleta validada (validate_palette.js, --pairs all, fondo blanco): coral, verde, azul.
// CVD en el borde (ΔE 8,0) → codificación secundaria: línea punteada + etiqueta directa al final.
// Vive fuera de los componentes "use client" para que también funcione en componentes de servidor.
export const SERIES_COLORS = { coral: "#e9502f", green: "#00876c", blue: "#2a78d6" } as const;

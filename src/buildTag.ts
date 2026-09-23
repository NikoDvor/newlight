// Injected by Vite at build time (see `define` in vite.config.ts).
declare const __BUILD_TAG__: string;

export const BUILD_TAG: string =
  typeof __BUILD_TAG__ === "string" ? __BUILD_TAG__ : "dev";

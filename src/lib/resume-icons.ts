/** Lucide icon SVGs (24×24 stroke style) used to render real LinkedIn / GitHub / Portfolio logos in the PDF resume. */
export type ResumeIconKey = "linkedin" | "github" | "globe";

const PATHS: Record<ResumeIconKey, string> = {
  linkedin: '<path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/>',
  github: '<path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 2 2 0 0 0 0-20"/><path d="M2 12h20"/>',
};

/** Builds a standalone SVG string for the icon, stroked in the given color. */
export function resumeIconSvg(key: ResumeIconKey, color: string): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${PATHS[key]}</svg>`;
}

/** Rasterizes an SVG string to PNG bytes at px×px; resolves null if the browser can't. */
export function svgToPng(svg: string, px = 64): Promise<ArrayBuffer | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = px; canvas.height = px;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0, px, px);
      canvas.toBlob((b) => { if (!b) return resolve(null); b.arrayBuffer().then((a) => resolve(a), () => resolve(null)); }, "image/png");
    };
    img.onerror = () => resolve(null);
    img.src = `data:image/svg+xml;base64,${btoa(svg)}`;
  });
}

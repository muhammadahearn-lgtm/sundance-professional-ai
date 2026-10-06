import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Remembers a resizable panel width per browser. */
export function usePanelWidth(key: string, def: number, min: number, max: number) {
  const [width, setW] = useState(def);
  useEffect(() => { const w = Number(localStorage.getItem(key)); if (w >= min && w <= max) setW(w); }, [key, min, max]);
  const setWidth = (w: number) => { const c = Math.min(max, Math.max(min, w)); setW(c); localStorage.setItem(key, String(c)); };
  return [width, setWidth] as const;
}

type Props = { label: string; width: number; setWidth: (w: number) => void; min: number; max: number; onHide: () => void; className?: string };

/** Lovable-style divider: drag to resize, double-click or click the grip to hide, arrow keys resize. */
export function PanelSeparator({ label, width, setWidth, min, max, onHide, className = "" }: Props) {
  const [drag, setDrag] = useState(false);
  function start(e: React.PointerEvent) {
    if ((e.target as HTMLElement).closest("button")) return;
    e.preventDefault();
    const x0 = e.clientX, w0 = width;
    setDrag(true);
    document.body.style.cursor = "col-resize"; document.body.style.userSelect = "none";
    const move = (ev: PointerEvent) => setWidth(w0 + ev.clientX - x0);
    const up = () => { setDrag(false); document.body.style.cursor = ""; document.body.style.userSelect = ""; window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", up);
  }
  return (
    <div role="separator" aria-orientation="vertical" aria-label={`Resize ${label}`} aria-valuemin={min} aria-valuemax={max} aria-valuenow={width} tabIndex={0}
      title="Drag to resize · double-click to hide"
      onPointerDown={start} onDoubleClick={onHide}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" || e.key === "ArrowRight") { e.preventDefault(); setWidth(width + (e.key === "ArrowRight" ? 16 : -16)); }
        else if (e.key === "Enter") { e.preventDefault(); onHide(); }
      }}
      className={`group absolute inset-y-0 -right-2 z-10 hidden w-4 cursor-col-resize justify-center outline-none lg:flex ${className}`}>
      <span className={`h-full w-px transition-all ${drag ? "w-0.5 bg-primary" : "bg-transparent group-hover:w-0.5 group-hover:bg-primary/50 group-focus-visible:w-0.5 group-focus-visible:bg-primary"}`} />
      <button type="button" onClick={onHide} aria-label={`Hide ${label}`} title={`Hide ${label}`}
        className={`absolute top-1/2 grid h-8 w-4 -translate-y-1/2 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-soft transition-opacity hover:border-primary hover:text-primary ${drag ? "opacity-100" : "opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100"}`}>
        <ChevronLeft className="h-3 w-3" />
      </button>
    </div>
  );
}

/** Slim edge strip shown while a panel is hidden: click or double-click to bring it back. */
export function PanelReveal({ label, onShow, className = "" }: { label: string; onShow: () => void; className?: string }) {
  return (
    <button type="button" onClick={onShow} onDoubleClick={onShow} aria-label={`Show ${label}`} title={`Show ${label}`}
      className={`group hidden w-3 shrink-0 items-center justify-center self-stretch outline-none lg:flex ${className}`}>
      <span className="h-full w-px bg-border transition-all group-hover:w-0.5 group-hover:bg-primary/50 group-focus-visible:bg-primary" />
      <span className="absolute grid h-8 w-4 place-items-center rounded-full border border-border bg-background text-muted-foreground shadow-soft transition-colors group-hover:border-primary group-hover:text-primary">
        <ChevronRight className="h-3 w-3" />
      </span>
    </button>
  );
}

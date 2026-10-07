import * as React from "react";
import { cn } from "@/lib/utils";

/** Clamp a thumb so the min handle never passes the max handle (and vice versa). */
export function clampRange(values: [number, number], index: 0 | 1, next: number, min: number, max: number, step: number, gap: number): [number, number] {
  const snapped = Math.round((next - min) / step) * step + min;
  const v = Math.min(max, Math.max(min, snapped));
  return index === 0 ? [Math.min(v, values[1] - gap), values[1]] : [values[0], Math.max(v, values[0] + gap)];
}

type Props = {
  min: number; max: number; step: number; value: [number, number];
  minGap?: number; className?: string; "aria-label"?: string;
  onValueChange: (v: [number, number]) => void;
  onValueCommit?: (v: [number, number]) => void;
};

/** Dual-handle range slider whose handles stop when they meet instead of swapping. */
export function RangeSlider({ min, max, step, value, minGap, className, onValueChange, onValueCommit, ...rest }: Props) {
  const gap = minGap ?? step;
  const track = React.useRef<HTMLDivElement>(null);
  const active = React.useRef<0 | 1 | null>(null);
  const latest = React.useRef(value);
  latest.current = value;
  const pct = (n: number) => ((n - min) / (max - min)) * 100;
  const fromX = (x: number) => { const r = track.current!.getBoundingClientRect(); return min + Math.min(1, Math.max(0, (x - r.left) / r.width)) * (max - min); };
  const move = (i: 0 | 1, n: number) => { const nv = clampRange(latest.current, i, n, min, max, step, gap); latest.current = nv; onValueChange(nv); return nv; };

  const down = (e: React.PointerEvent) => {
    const n = fromX(e.clientX);
    const [a, b] = latest.current;
    const i: 0 | 1 = Math.abs(n - a) < Math.abs(n - b) || (n < a) ? 0 : n > b ? 1 : Math.abs(n - a) === Math.abs(n - b) ? (n < a ? 0 : 1) : 1;
    active.current = i;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    move(i, n);
  };
  const drag = (e: React.PointerEvent) => { if (active.current !== null) move(active.current, fromX(e.clientX)); };
  const up = () => { if (active.current !== null) { active.current = null; onValueCommit?.(latest.current); } };
  const key = (i: 0 | 1) => (e: React.KeyboardEvent) => {
    const d = e.key === "ArrowRight" || e.key === "ArrowUp" ? step : e.key === "ArrowLeft" || e.key === "ArrowDown" ? -step : 0;
    const target = e.key === "Home" ? min : e.key === "End" ? max : d ? latest.current[i] + d : null;
    if (target === null) return;
    e.preventDefault();
    onValueCommit?.(move(i, target));
  };

  return (
    <div className={cn("relative flex h-5 w-full touch-none select-none items-center", className)} onPointerDown={down} onPointerMove={drag} onPointerUp={up} onPointerCancel={up} aria-label={rest["aria-label"]} role="group">
      <div ref={track} className="relative h-1.5 w-full rounded-full bg-primary/20">
        <div className="absolute h-full rounded-full bg-primary" style={{ left: `${pct(value[0])}%`, right: `${100 - pct(value[1])}%` }} />
      </div>
      {([0, 1] as const).map((i) => (
        <span key={i} role="slider" tabIndex={0} aria-label={i === 0 ? "Minimum" : "Maximum"} aria-valuemin={min} aria-valuemax={max} aria-valuenow={value[i]} onKeyDown={key(i)}
          className="absolute top-1/2 block h-4 w-4 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          style={{ left: `${pct(value[i])}%` }} />
      ))}
    </div>
  );
}

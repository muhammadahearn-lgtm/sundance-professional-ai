import { Fragment, useRef, type ReactNode } from "react";
import { Bold, Heading2, Link2, List, ListOrdered, LayoutTemplate } from "lucide-react";
import { inputCls } from "@/components/profile/parts";

export const DESCRIPTION_TEMPLATE = `## About The Role\n\n\n## Responsibilities\n- \n\n## Required Qualifications\n- \n\n## Preferred Qualifications\n- \n\n## Benefits\n- \n\n## About The Company\n`;

/** Inline: **bold** and [text](https://url). Only http(s)/mailto links render. */
function inline(text: string): ReactNode[] {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0, m: RegExpExecArray | null, i = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1] !== undefined) out.push(<strong key={i++}>{m[1]}</strong>);
    else if (m[2] !== undefined && m[3] !== undefined && /^(https?:|mailto:)/i.test(m[3])) out.push(<a key={i++} href={m[3]} target="_blank" rel="noreferrer noopener" className="font-medium text-primary underline">{m[2]}</a>);
    else out.push(m[0]);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(text.slice(last));
  return out;
}

export function Markdown({ text }: { text: string }) {
  const lines = text.split("\n");
  const blocks: ReactNode[] = [];
  let k = 0;
  for (let i = 0; i < lines.length;) {
    const l = lines[i]!;
    if (/^#{1,3}\s/.test(l)) { blocks.push(<h3 key={k++} className="mt-5 font-display text-base font-bold first:mt-0">{inline(l.replace(/^#{1,3}\s/, ""))}</h3>); i++; continue; }
    if (/^[-*]\s/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*]\s/.test(lines[i]!)) { items.push(lines[i]!.slice(2)); i++; }
      blocks.push(<ul key={k++} className="ml-5 list-disc space-y-1">{items.filter((x) => x.trim()).map((x, j) => <li key={j}>{inline(x)}</li>)}</ul>); continue;
    }
    if (/^\d+\.\s/.test(l)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i]!)) { items.push(lines[i]!.replace(/^\d+\.\s/, "")); i++; }
      blocks.push(<ol key={k++} className="ml-5 list-decimal space-y-1">{items.map((x, j) => <li key={j}>{inline(x)}</li>)}</ol>); continue;
    }
    if (!l.trim()) { i++; continue; }
    const para: string[] = [];
    while (i < lines.length && lines[i]!.trim() && !/^(#{1,3}\s|[-*]\s|\d+\.\s)/.test(lines[i]!)) { para.push(lines[i]!); i++; }
    blocks.push(<p key={k++}>{para.map((p, j) => <Fragment key={j}>{j > 0 && <br />}{inline(p)}</Fragment>)}</p>);
  }
  return <div className="space-y-3 text-sm leading-relaxed">{blocks}</div>;
}

export function MarkdownEditor({ value, onChange, rows = 14, placeholder }: { value: string; onChange: (v: string) => void; rows?: number; placeholder?: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const wrap = (before: string, after = "", fallback = "text") => {
    const t = ref.current; if (!t) return;
    const s = t.selectionStart, e = t.selectionEnd, sel = value.slice(s, e) || fallback;
    onChange(value.slice(0, s) + before + sel + after + value.slice(e));
    requestAnimationFrame(() => { t.focus(); t.setSelectionRange(s + before.length, s + before.length + sel.length); });
  };
  const linePrefix = (p: string) => {
    const t = ref.current; if (!t) return;
    const s = value.lastIndexOf("\n", t.selectionStart - 1) + 1;
    onChange(value.slice(0, s) + p + value.slice(s));
    requestAnimationFrame(() => t.focus());
  };
  const btn = (label: string, icon: ReactNode, fn: () => void) => (
    <button type="button" title={label} aria-label={label} onClick={fn} className="grid h-8 w-8 place-items-center rounded-lg hover:bg-muted hover:text-primary">{icon}</button>
  );
  return (
    <div className="overflow-hidden rounded-xl border border-input focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/20">
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-muted/40 p-1">
        {btn("Heading", <Heading2 className="h-4 w-4" />, () => linePrefix("## "))}
        {btn("Bold", <Bold className="h-4 w-4" />, () => wrap("**", "**", "bold text"))}
        {btn("Bullet list", <List className="h-4 w-4" />, () => linePrefix("- "))}
        {btn("Numbered list", <ListOrdered className="h-4 w-4" />, () => linePrefix("1. "))}
        {btn("Link", <Link2 className="h-4 w-4" />, () => wrap("[", "](https://)", "link text"))}
        {!value.trim() && <button type="button" onClick={() => onChange(DESCRIPTION_TEMPLATE)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs font-semibold text-primary hover:bg-primary-soft"><LayoutTemplate className="h-3.5 w-3.5" />Insert section template</button>}
      </div>
      <textarea ref={ref} rows={rows} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={`${inputCls} rounded-none border-0 font-mono text-[13px] focus:ring-0`} />
    </div>
  );
}

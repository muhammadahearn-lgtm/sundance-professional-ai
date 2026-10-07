// Resume upload + auto-fill card. Reads the file in the browser, asks the AI to
// structure it, matches values to governed lists, and hands the result to the parent.
// Nothing is saved here — the candidate reviews everything before saving.
import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { FileText, Loader2, Sparkles, UploadCloud, X, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { extractResumeText, validateResumeUpload } from "@/lib/document-text-extractor";
import { parseResume } from "@/lib/resume-parser.functions";
import { matchResume, type Catalogs, type MatchedResume } from "@/lib/resume-taxonomy-matcher";
import type { ParsedResume } from "@/lib/resume-parse";

type Phase = "idle" | "reading" | "parsing" | "matching" | "done" | "error";
const STEPS: { key: Phase; label: string }[] = [
  { key: "reading", label: "Reading your file" },
  { key: "parsing", label: "Understanding your experience" },
  { key: "matching", label: "Matching skills and tools" },
];

export function ResumeUploadCard({ catalogs, onParsed, onSkip, className, initialFile }: {
  initialFile?: File | null;
  catalogs: Catalogs | null;
  onParsed: (resume: ParsedResume, matched: MatchedResume) => void;
  onSkip?: () => void;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const parse = useServerFn(parseResume);
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [drag, setDrag] = useState(false);
  const [summary, setSummary] = useState<{ items: number; jobs: number; schools: number; unmatched: number } | null>(null);
  const busy = phase === "reading" || phase === "parsing" || phase === "matching";

  async function handle(file: File) {
    setError(""); setSummary(null); setFileName(file.name);
    const invalid = validateResumeUpload(file);
    if (invalid) { setError(invalid); setPhase("error"); return; }
    try {
      setPhase("reading");
      const text = await extractResumeText(file);
      if (text.trim().length < 80) throw new Error("We couldn't find readable text in this file. Scanned images aren't supported — try a PDF exported from Word or Google Docs.");
      setPhase("parsing");
      const res = await parse({ data: { text } });
      if (!res.ok) throw new Error(res.error);
      setPhase("matching");
      if (!catalogs) throw new Error("Lists are still loading. Please try again in a moment.");
      const matched = matchResume(res.resume, catalogs);
      setSummary({
        items: matched.languages.length + matched.skills.length + matched.technologies.length + matched.softSkills.length,
        jobs: res.resume.experience.length, schools: res.resume.education.length, unmatched: matched.unmatched.length,
      });
      setPhase("done");
      onParsed(res.resume, matched);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : "We couldn't read this resume. Please try again or enter your details manually.");
      setPhase("error");
    }
  }

  const started = useRef<File | null>(null);
  useEffect(() => {
    if (initialFile && catalogs && started.current !== initialFile) { started.current = initialFile; void handle(initialFile); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialFile, catalogs]);

  const stepIndex = STEPS.findIndex((s) => s.key === phase);

  return (
    <div className={cn("rounded-2xl border bg-card p-5 shadow-sm", className)}>
      <div className="mb-4 flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><Sparkles className="h-5 w-5" /></div>
        <div>
          <h3 className="font-semibold">Auto-fill from your resume</h3>
          <p className="text-sm text-muted-foreground">Upload a PDF, Word or text file. We fill in your profile — you review everything before saving.</p>
        </div>
      </div>

      {busy ? (
        <div className="rounded-xl border border-dashed bg-muted/30 p-6">
          <p className="mb-4 flex items-center gap-2 text-sm font-medium"><FileText className="h-4 w-4 text-primary" />{fileName}</p>
          <ol className="space-y-2.5">
            {STEPS.map((s, i) => (
              <li key={s.key} className={cn("flex items-center gap-2 text-sm", i > stepIndex && "text-muted-foreground")}>
                {i < stepIndex ? <CheckCircle2 className="h-4 w-4 text-primary" /> : i === stepIndex ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <span className="h-4 w-4 rounded-full border" />}
                {s.label}
              </li>
            ))}
          </ol>
          <p className="mt-4 text-xs text-muted-foreground">This usually takes 10–30 seconds.</p>
        </div>
      ) : phase === "done" && summary ? (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-5">
          <p className="flex items-center gap-2 font-medium"><CheckCircle2 className="h-5 w-5 text-primary" />Resume read — please review below</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Found {summary.items} skills & tools, {summary.jobs} {summary.jobs === 1 ? "job" : "jobs"} and {summary.schools} {summary.schools === 1 ? "school" : "schools"}.
            {summary.unmatched > 0 && ` ${summary.unmatched} item${summary.unmatched === 1 ? "" : "s"} aren't on our lists yet — you can add them below.`}
          </p>
          <Button variant="ghost" size="sm" className="mt-3 px-0" onClick={() => { setPhase("idle"); inputRef.current?.click(); }}>Upload a different file</Button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={(e) => { e.preventDefault(); setDrag(false); const f = e.dataTransfer.files?.[0]; if (f) void handle(f); }}
            className={cn("flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed p-8 text-center transition-colors hover:border-primary/60 hover:bg-primary/5",
              drag && "border-primary bg-primary/5")}
          >
            <UploadCloud className="h-8 w-8 text-primary" />
            <span className="font-medium">Drop your resume here or click to browse</span>
            <span className="text-xs text-muted-foreground">PDF, DOCX or TXT · up to 5 MB · your file isn't stored</span>
          </button>
          {phase === "error" && error && (
            <div role="alert" className="mt-3 flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><span className="flex-1">{error}</span>
              <button aria-label="Dismiss" onClick={() => { setError(""); setPhase("idle"); }}><X className="h-4 w-4" /></button>
            </div>
          )}
          {onSkip && <Button variant="link" size="sm" className="mt-2 px-0" onClick={onSkip}>Skip — I'll enter my details manually</Button>}
        </>
      )}
      <input ref={inputRef} type="file" hidden accept=".pdf,.docx,.txt,application/pdf,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (f) void handle(f); }} />
    </div>
  );
}

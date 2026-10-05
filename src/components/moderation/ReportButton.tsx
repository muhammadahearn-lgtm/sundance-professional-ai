import { useState } from "react";
import { Flag } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { MAX_DETAILS, REPORT_REASONS, TARGET_LABEL, validateReport, type ReportTarget } from "@/lib/reports";

export function ReportButton({ type, targetId, className, compact }: { type: ReportTarget; targetId: string; className?: string; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const noun = TARGET_LABEL[type].toLowerCase();

  async function submit() {
    const err = validateReport(reason, details);
    if (err) return setError(err);
    setBusy(true);
    const { data: u } = await supabase.auth.getUser();
    const { error: e } = await supabase.from("reports").insert({
      reporter_id: u.user?.id ?? "", target_type: type, target_id: targetId, reason, details: details.trim(),
    });
    setBusy(false);
    if (e && e.code !== "23505") return setError("We couldn't send your report. Please try again.");
    setOpen(false); setReason(""); setDetails(""); setError(null);
    toast.success(e ? "You've already reported this. Our team is reviewing it." : "Thanks — our team will review your report.");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) setError(null); }}>
      <DialogTrigger asChild>
        <button type="button" aria-label={`Report this ${noun}`} className={className ?? "inline-flex items-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:border-destructive/50 hover:text-destructive"}>
          <Flag className="h-4 w-4" />{!compact && "Report"}
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report this {noun}</DialogTitle>
          <DialogDescription>Reports are private. The other person isn't told who reported them.</DialogDescription>
        </DialogHeader>
        <RadioGroup value={reason} onValueChange={(v) => { setReason(v); setError(null); }} className="gap-2">
          {REPORT_REASONS.map((r) => (
            <Label key={r.value} className="flex items-center gap-3 rounded-lg border border-border p-3 font-normal">
              <RadioGroupItem value={r.value} />{r.label}
            </Label>
          ))}
        </RadioGroup>
        <div className="space-y-2">
          <Label htmlFor="report-details">Details {reason === "other" ? "" : "(optional)"}</Label>
          <Textarea id="report-details" value={details} maxLength={MAX_DETAILS} onChange={(e) => setDetails(e.target.value)} placeholder="What happened?" />
        </div>
        {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={busy}>{busy ? "Sending…" : "Send report"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

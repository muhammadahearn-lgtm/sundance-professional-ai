import { notifyByEmail } from "@/lib/applications-data";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, ArchiveRestore, ArrowLeft, Check, CheckCheck, Download, Eye, FileText, Loader2, MessageSquare, Paperclip, Search, Send } from "lucide-react";
import { toast } from "sonner";
import { ReportButton } from "@/components/moderation/ReportButton";
import { supabase } from "@/integrations/supabase/client";
import { filterInbox, linkify, MESSAGE_MAX, unreadConversations, validateAttachment, validateMessage, type InboxFilter, type InboxRow } from "@/lib/messaging";
import { AppStatusBadge } from "@/components/applications/Applications";
import { JobContextStrip } from "@/components/messages/JobContextStrip";

type Role = "candidate" | "recruiter";
const card = "rounded-2xl border border-border bg-card shadow-soft";
const btn = "inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-50";
const label = (s: string) => s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
const when = (d: string | null) => {
  if (!d) return "";
  const t = new Date(d), now = new Date();
  return t.toDateString() === now.toDateString() ? t.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }) : t.toLocaleDateString([], { month: "short", day: "numeric" });
};
const errMsg = (e: unknown, fallback: string) => {
  const m = e instanceof Error ? e.message : String((e as { message?: string })?.message ?? "");
  if (/access denied/i.test(m)) return "Access Denied";
  if (/session|jwt/i.test(m)) return "Session Expired";
  if (/fetch|network/i.test(m)) return "Network Error";
  if (/closed/i.test(m)) return "This conversation is closed";
  return fallback;
};

export type Conversation = InboxRow & { application_status: string | null; pipeline_stage: string | null; last_message_at: string | null; created_at: string; application_id: string | null };
type Msg = { message_id: string; conversation_id: string; sender_id: string; message_body: string; message_status: string; attachment_path: string | null; attachment_name: string | null; attachment_size: number | null; created_at: string; pending?: boolean; failed?: boolean };

export function useInbox() {
  return useQuery({
    queryKey: ["inbox"],
    queryFn: async () => {
      await supabase.rpc("mark_messages_delivered");
      const { data, error } = await supabase.rpc("my_conversations");
      if (error) throw error;
      return (data ?? []) as Conversation[];
    },
    refetchInterval: 20000,
  });
}
/** Unread conversation count for nav badge and dashboards. */
export function useUnreadCount() {
  const q = useInbox();
  return unreadConversations(q.data ?? []);
}

/** Start or reuse a conversation, then open it. */
export function MessageButton({ role, candidateId, jobId, label: text, className, iconOnly }: { role: Role; candidateId: string; jobId?: string | null | undefined; label?: string; className?: string; iconOnly?: boolean }) {
  const nav = useNavigate();
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const { data, error } = await supabase.rpc("start_conversation", jobId ? { _candidate: candidateId, _job: jobId } : { _candidate: candidateId });
    setBusy(false);
    if (error || !data) { toast.error(errMsg(error, "Unable to start conversation")); return; }
    qc.invalidateQueries({ queryKey: ["inbox"] });
    nav(role === "recruiter" ? { to: "/recruiter/messages/$conversationId", params: { conversationId: data } } : { to: "/candidate/messages/$conversationId", params: { conversationId: data } });
  }
  const lbl = text ?? (role === "recruiter" ? "Message Candidate" : "Message Recruiter");
  return <button type="button" onClick={go} disabled={busy} aria-label={lbl} title={lbl} className={className ?? btn}>{busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MessageSquare className="h-4 w-4" />}{!iconOnly && lbl}</button>;
}

/** Candidate "Contact Recruiter": only shown when they applied or the recruiter already wrote. */
export function ContactRecruiterButton({ uid, jobId, className }: { uid: string; jobId: string; className?: string }) {
  const q = useQuery({
    queryKey: ["can-contact", uid, jobId],
    queryFn: async () => {
      const [a, c] = await Promise.all([
        supabase.from("applications").select("application_id").eq("candidate_id", uid).eq("job_id", jobId).maybeSingle(),
        supabase.from("conversations").select("conversation_id").eq("candidate_id", uid).eq("job_id", jobId).maybeSingle(),
      ]);
      return !!a.data || !!c.data;
    },
  });
  if (!q.data) return null;
  return <MessageButton role="candidate" candidateId={uid} jobId={jobId} label="Contact Recruiter" {...(className ? { className } : {})} />;
}

function Badge({ n }: { n: number }) { return n ? <span className="grid h-5 min-w-5 place-items-center rounded-full bg-primary px-1.5 text-[11px] font-bold text-primary-foreground">{n}</span> : null; }

export function MessagesPage({ uid, role, activeId }: { uid: string; role: Role; activeId?: string | undefined }) {
  const q = useInbox();
  const [filter, setFilter] = useState<InboxFilter>("all");
  const [search, setSearch] = useState("");
  const [job, setJob] = useState("");
  const [person, setPerson] = useState("");
  const rows = q.data ?? [];
  const term = search.trim();
  const hits = useQuery({
    queryKey: ["inbox-search", term],
    enabled: term.length >= 2,
    queryFn: async () => {
      const { data } = await supabase.from("messages").select("conversation_id").ilike("message_body", `%${term.replace(/[%_]/g, "")}%`).limit(200);
      return new Set((data ?? []).map((m) => m.conversation_id));
    },
  });
  const list = filterInbox(rows, { filter, q: search, job, person, ...(hits.data ? { textHits: hits.data } : {}) }) as Conversation[];
  const jobs = [...new Map(rows.filter((r) => r.job_id).map((r) => [r.job_id!, r.job_title ?? "Job"])).entries()];
  const people = [...new Map(rows.map((r) => (role === "recruiter" ? [r.candidate_id, r.candidate_name] : [r.recruiter_id, r.recruiter_name]))).entries()];
  const active = rows.find((r) => r.conversation_id === activeId);
  const unread = unreadConversations(rows);

  return (
    <div>
      <div className="mb-4 flex items-center gap-3"><h1 className="text-2xl font-extrabold tracking-tight sm:text-3xl">Messages</h1><Badge n={unread} /></div>
      <div className={`${card} grid h-[calc(100vh-11rem)] min-h-[520px] overflow-hidden md:grid-cols-[340px_1fr]`}>
        <aside className={`flex min-h-0 flex-col border-border md:border-r ${activeId ? "hidden md:flex" : "flex"}`}>
          <div className="space-y-2 border-b border-border p-3">
            <div className="relative"><Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search names, jobs, companies, messages" className="w-full rounded-lg border border-input bg-background py-2 pl-9 pr-3 text-sm" /></div>
            <div className="flex flex-wrap gap-1">{(["all", "unread", "active", "archived"] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`rounded-full px-2.5 py-1 text-xs font-semibold ${filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{f === "all" ? "All" : label(f)}</button>)}</div>
            <div className="grid grid-cols-2 gap-2">
              <select value={job} onChange={(e) => setJob(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs"><option value="">All jobs</option>{jobs.map(([id, t]) => <option key={id} value={id}>{t}</option>)}</select>
              <select value={person} onChange={(e) => setPerson(e.target.value)} className="rounded-lg border border-input bg-background px-2 py-1.5 text-xs"><option value="">{role === "recruiter" ? "All candidates" : "All recruiters"}</option>{people.map(([id, n]) => <option key={id} value={id}>{n}</option>)}</select>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {q.isLoading ? <div className="space-y-2 p-3">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-muted" />)}</div>
              : q.error ? <div className="p-4 text-sm" role="alert"><p className="text-destructive">{errMsg(q.error, "Unable to load conversations")}</p><button type="button" onClick={() => void q.refetch()} className="mt-2 font-semibold text-primary underline-offset-2 hover:underline">Try again</button></div>
              : !list.length ? <div className="p-6 text-center text-sm text-muted-foreground">{rows.length ? "No conversations match." : role === "recruiter" ? "No conversations yet. Use “Message Candidate” on a profile, application or pipeline card." : "No conversations yet. You can message a recruiter after applying to their job."}</div>
              : list.map((r) => {
                const other = role === "recruiter" ? r.candidate_name : r.recruiter_name;
                return (
                  <Link key={r.conversation_id} to={role === "recruiter" ? "/recruiter/messages/$conversationId" : "/candidate/messages/$conversationId"} params={{ conversationId: r.conversation_id }}
                    className={`flex gap-3 border-b border-border px-3 py-3 hover:bg-muted/60 ${r.conversation_id === activeId ? "bg-primary-soft" : ""}`}>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">{(other || "?").slice(0, 1)}</div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2"><p className={`truncate text-sm ${r.unread ? "font-bold" : "font-semibold"}`}>{other || "Participant"}</p><span className="ml-auto shrink-0 text-[11px] text-muted-foreground">{when(r.last_message_at ?? r.created_at)}</span></div>
                      <p className="truncate text-xs text-primary">{r.job_title ?? "General"}{r.company_name ? ` · ${r.company_name}` : ""}</p>
                      <div className="flex items-center gap-2"><p className={`truncate text-xs ${r.unread ? "text-foreground" : "text-muted-foreground"}`}>{r.last_message_preview || "No messages yet"}</p><span className="ml-auto"><Badge n={r.unread} /></span></div>
                    </div>
                  </Link>
                );
              })}
          </div>
        </aside>
        <section className={`min-h-0 flex-col ${activeId ? "flex" : "hidden md:flex"}`}>
          {activeId ? (q.isLoading ? <div className="grid flex-1 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div>
            : active ? <Thread key={active.conversation_id} uid={uid} role={role} c={active} />
            : <div className="grid flex-1 place-items-center p-6 text-center"><div><p className="font-semibold">Conversation Not Found</p><Link to={role === "recruiter" ? "/recruiter/messages" : "/candidate/messages"} className="mt-2 inline-block text-sm text-primary">Back to inbox</Link></div></div>)
            : <div className="grid flex-1 place-items-center p-6 text-center text-sm text-muted-foreground"><div><MessageSquare className="mx-auto mb-2 h-8 w-8" />Select a conversation</div></div>}
        </section>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">Notification Integration Coming Soon — new-message alerts will connect to the Notifications system.</p>
    </div>
  );
}

function Status({ m }: { m: Msg }) {
  if (m.failed) return <span className="text-destructive">Message Failed</span>;
  if (m.pending) return <span>Sending…</span>;
  if (m.message_status === "read") return <span className="inline-flex items-center gap-0.5 text-primary"><CheckCheck className="h-3 w-3" />Read</span>;
  if (m.message_status === "delivered") return <span className="inline-flex items-center gap-0.5"><CheckCheck className="h-3 w-3" />Delivered</span>;
  return <span className="inline-flex items-center gap-0.5"><Check className="h-3 w-3" />Sent</span>;
}

async function openAttachment(path: string, name: string, download: boolean) {
  const { data, error } = await supabase.storage.from("message-attachments").createSignedUrl(path, 60, download ? { download: name } : undefined);
  if (error || !data) { toast.error("Couldn't open the attachment"); return; }
  window.open(data.signedUrl, "_blank", "noopener");
}

function Thread({ uid, role, c }: { uid: string; role: Role; c: Conversation }) {
  const qc = useQueryClient();
  const key = ["thread", c.conversation_id];
  const msgs = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase.from("messages").select("*").eq("conversation_id", c.conversation_id).order("created_at");
      if (error) throw error;
      return (data ?? []) as Msg[];
    },
    refetchInterval: 15000,
  });
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [sending, setSending] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  const fileIn = useRef<HTMLInputElement>(null);
  const draftKey = `sundance.draft.${c.conversation_id}`;

  useEffect(() => { setBody(localStorage.getItem(draftKey) ?? ""); }, [draftKey]);
  useEffect(() => { if (body) localStorage.setItem(draftKey, body); else localStorage.removeItem(draftKey); }, [body, draftKey]);

  const markRead = useMemo(() => async () => { await supabase.rpc("mark_conversation_read", { _conv: c.conversation_id }); qc.invalidateQueries({ queryKey: ["inbox"] }); }, [c.conversation_id, qc]);
  useEffect(() => { void markRead(); }, [markRead]);

  useEffect(() => {
    const ch = supabase.channel(`thread-${c.conversation_id}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "messages", filter: `conversation_id=eq.${c.conversation_id}` }, (p) => {
        const m = p.new as Msg;
        void qc.invalidateQueries({ queryKey: key });
        if (p.eventType === "INSERT" && m.sender_id !== uid) void markRead();
      }).subscribe();
    return () => { void supabase.removeChannel(ch); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [c.conversation_id, uid]);

  useEffect(() => { end.current?.scrollIntoView({ block: "end" }); }, [msgs.data?.length]);

  async function send() {
    const err = validateMessage(body, !!file);
    if (err) { toast.error(err); return; }
    setSending(true);
    const tempId = `tmp-${Date.now()}`;
    const text = body;
    const optimistic: Msg = { message_id: tempId, conversation_id: c.conversation_id, sender_id: uid, message_body: text, message_status: "sent", attachment_path: null, attachment_name: file?.name ?? null, attachment_size: file?.size ?? null, created_at: new Date().toISOString(), pending: true };
    qc.setQueryData<Msg[]>(key, (p = []) => [...p, optimistic]);
    setBody("");
    let att: { path: string; name: string; size: number } | null = null;
    if (file) {
      const path = `${c.conversation_id}/${crypto.randomUUID()}-${file.name.replace(/[^\w.-]+/g, "_")}`;
      const up = await supabase.storage.from("message-attachments").upload(path, file, file.type ? { contentType: file.type } : {});
      if (up.error) {
        toast.error("Attachment Upload Failed");
        qc.setQueryData<Msg[]>(key, (p = []) => p.filter((m) => m.message_id !== tempId));
        setBody(text); setSending(false); return;
      }
      att = { path, name: file.name, size: file.size };
      toast.success("Attachment Uploaded");
    }
    const { data, error } = await supabase.from("messages").insert({ conversation_id: c.conversation_id, sender_id: uid, sender_type: role, message_body: text, attachment_path: att?.path ?? null, attachment_name: att?.name ?? null, attachment_size: att?.size ?? null }).select("*").single();
    if (error || !data) {
      toast.error(errMsg(error, "Unable To Send Message"));
      qc.setQueryData<Msg[]>(key, (p = []) => p.map((m) => (m.message_id === tempId ? { ...m, pending: false, failed: true } : m)));
      setBody(text);
    } else {
      qc.setQueryData<Msg[]>(key, (p = []) => { const rest = p.filter((m) => m.message_id !== tempId && m.message_id !== data.message_id); return [...rest, data as Msg]; });
      setFile(null);
      notifyByEmail("message", data.message_id);
      qc.invalidateQueries({ queryKey: ["inbox"] });
    }
    setSending(false);
  }

  async function archive(on: boolean) {
    const { error } = await supabase.rpc("set_conversation_archived", { _conv: c.conversation_id, _archived: on });
    if (error) { toast.error(errMsg(error, "Couldn't update conversation")); return; }
    toast.success(on ? "Conversation Archived" : "Conversation Restored");
    qc.invalidateQueries({ queryKey: ["inbox"] });
  }

  const back = role === "recruiter" ? "/recruiter/messages" : "/candidate/messages";
  return (
    <>
      <header className="border-b border-border p-4">
        <div className="flex items-start gap-3">
          <Link to={back} className="mt-1 md:hidden" aria-label="Back to inbox"><ArrowLeft className="h-5 w-5" /></Link>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2"><p className="font-display font-bold">{role === "recruiter" ? c.candidate_name : c.recruiter_name}</p><ReportButton type="message" targetId={c.conversation_id} compact className="ml-auto rounded-full p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" /></div>
            <div className="mt-1 grid gap-x-4 gap-y-0.5 text-xs text-muted-foreground sm:grid-cols-2">
              <span><b className="text-foreground">Job:</b> {c.job_title ?? "General conversation"}</span>
              <span><b className="text-foreground">Company:</b> {c.company_name || "—"}</span>
              <span><b className="text-foreground">Candidate:</b> {c.candidate_name}</span>
              <span><b className="text-foreground">Recruiter:</b> {c.recruiter_name}</span>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
              {c.application_status ? <><span className="text-muted-foreground">Application:</span><AppStatusBadge s={c.application_status} /></> : <span className="text-muted-foreground">No application</span>}
              {role === "recruiter" && c.pipeline_stage && <span className="rounded-full bg-muted px-2 py-0.5 font-semibold">Pipeline: {label(c.pipeline_stage)}</span>}
            </div>
          </div>
          <div className="flex shrink-0 flex-col gap-1.5 sm:flex-row">
            {role === "recruiter" && <Link to="/recruiter/candidates/$id" params={{ id: c.candidate_id }} className={btn}>Profile</Link>}
            {c.job_id && role === "candidate" && <Link to="/candidate/jobs/$id" params={{ id: c.job_id }} className={btn}>Job</Link>}
            <button onClick={() => archive(!c.archived)} className={btn}>{c.archived ? <><ArchiveRestore className="h-4 w-4" />Restore</> : <><Archive className="h-4 w-4" />Archive</>}</button>
          </div>
        </div>
      </header>
      {c.job_id && <JobContextStrip c={c} role={role} />}
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/30 p-4">
        {msgs.isLoading ? <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
          : msgs.error ? <p className="text-center text-sm text-destructive">{errMsg(msgs.error, "Unable to load messages")}</p>
          : !msgs.data?.length ? <p className="text-center text-sm text-muted-foreground">No messages yet — say hello.</p>
          : msgs.data.map((m) => {
            const mine = m.sender_id === uid;
            return (
              <div key={m.message_id} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm sm:max-w-[70%] ${mine ? "bg-primary text-primary-foreground" : "border border-border bg-card"}`}>
                  {m.message_body && <p className="whitespace-pre-wrap break-words">{linkify(m.message_body).map((p, i) => p.href ? <a key={i} href={p.href} target="_blank" rel="noopener noreferrer" className="underline">{p.text}</a> : <span key={i}>{p.text}</span>)}</p>}
                  {m.attachment_name && (
                    <div className={`mt-2 flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs ${mine ? "bg-primary-foreground/15" : "bg-muted"}`}>
                      <FileText className="h-4 w-4 shrink-0" /><span className="min-w-0 flex-1 truncate">{m.attachment_name}{m.attachment_size ? ` · ${Math.ceil(m.attachment_size / 1024)} KB` : ""}</span>
                      {m.attachment_path && <><button onClick={() => openAttachment(m.attachment_path!, m.attachment_name!, false)} aria-label="Preview"><Eye className="h-4 w-4" /></button><button onClick={() => openAttachment(m.attachment_path!, m.attachment_name!, true)} aria-label="Download"><Download className="h-4 w-4" /></button></>}
                    </div>
                  )}
                  <div className={`mt-1 flex justify-end gap-2 text-[10px] ${mine ? "text-primary-foreground/80" : "text-muted-foreground"}`}><span>{new Date(m.created_at).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</span>{mine && <Status m={m} />}</div>
                </div>
              </div>
            );
          })}
        <div ref={end} />
      </div>
      <footer className="border-t border-border p-3">
        {c.conversation_status === "closed" ? <p className="text-center text-sm text-muted-foreground">This conversation is closed.</p> : <>
          {file && <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted px-3 py-1.5 text-xs"><Paperclip className="h-3.5 w-3.5" /><span className="flex-1 truncate">{file.name}</span><button onClick={() => setFile(null)} className="font-semibold text-destructive">Remove</button></div>}
          <div className="flex items-end gap-2">
            <input ref={fileIn} type="file" accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ""; if (!f) return; const er = validateAttachment(f); if (er) toast.error(er); else setFile(f); }} />
            <button onClick={() => fileIn.current?.click()} className="rounded-lg p-2.5 text-muted-foreground hover:bg-muted" aria-label="Attach file"><Paperclip className="h-5 w-5" /></button>
            <div className="flex-1">
              <textarea value={body} onChange={(e) => setBody(e.target.value.slice(0, MESSAGE_MAX))} onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }} rows={2} placeholder="Write a message… (Shift+Enter for a new line)" className="w-full resize-none rounded-xl border border-input bg-background px-3 py-2 text-sm" />
              <p className="text-right text-[10px] text-muted-foreground">{body.length.toLocaleString()} / {MESSAGE_MAX.toLocaleString()}{body ? " · Draft saved" : ""}</p>
            </div>
            <button onClick={send} disabled={sending || (!body.trim() && !file)} className="mb-5 inline-flex items-center gap-1.5 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50" aria-label="Send">{sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}<span className="hidden sm:inline">Send</span></button>
          </div>
        </>}
      </footer>
    </>
  );
}

/** Dashboard widget: unread count, recent conversations, recent activity. */
export function MessagesWidget({ role }: { role: Role }) {
  const q = useInbox();
  const rows = (q.data ?? []).filter((r) => !r.archived);
  const unread = unreadConversations(rows);
  const base = role === "recruiter" ? "/recruiter/messages" : "/candidate/messages";
  const sent = role === "recruiter" ? rows.filter((r) => r.last_message_at).length : 0;
  return (
    <section className={`${card} p-5`}>
      <div className="mb-3 flex items-center gap-2"><MessageSquare className="h-4 w-4 text-primary" /><h2 className="font-display font-bold">Messages</h2><Badge n={unread} /><Link to={base} className="ml-auto text-xs font-semibold text-primary hover:underline">Open inbox</Link></div>
      {q.isLoading ? <div className="h-20 animate-pulse rounded-xl bg-muted" /> : (
        <>
          <p className="text-sm"><b>{unread}</b> unread conversation{unread === 1 ? "" : "s"}{role === "recruiter" && <> · <b>{sent}</b> active outreach thread{sent === 1 ? "" : "s"}</>}</p>
          {rows.length ? <ul className="mt-3 space-y-2">{rows.slice(0, 4).map((r) => (
            <li key={r.conversation_id}>
              <Link to={role === "recruiter" ? "/recruiter/messages/$conversationId" : "/candidate/messages/$conversationId"} params={{ conversationId: r.conversation_id }} className="flex items-center gap-2 text-sm hover:text-primary">
                <span className={`min-w-0 flex-1 truncate ${r.unread ? "font-bold" : "font-medium"}`}>{role === "recruiter" ? r.candidate_name : r.recruiter_name}<span className="font-normal text-muted-foreground"> · {r.last_message_preview || r.job_title || "New conversation"}</span></span>
                <span className="shrink-0 text-[11px] text-muted-foreground">{when(r.last_message_at ?? r.created_at)}</span>
              </Link>
            </li>))}</ul>
            : <p className="mt-2 text-sm text-muted-foreground">No conversations yet.</p>}
        </>
      )}
    </section>
  );
}

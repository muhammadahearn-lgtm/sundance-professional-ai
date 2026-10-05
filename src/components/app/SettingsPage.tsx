import { NotificationPreferences } from "@/components/notifications/Notifications";
import { useNavigate, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQueryClient } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import type { Account } from "@/lib/account";
import { friendlyAuthError, validateNewPassword } from "@/lib/auth-rules";
import { deleteMyAccount } from "@/lib/account.functions";
import { FormAlert } from "@/components/auth/AuthCard";
import { PageHeader } from "./AppShell";

function Card({ title, desc, children, danger }: { title: string; desc?: string; children: ReactNode; danger?: boolean }) {
  return (
    <section className={`rounded-2xl border bg-card p-6 shadow-soft ${danger ? "border-destructive/40" : "border-border"}`}>
      <h2 className={`font-bold ${danger ? "text-destructive" : ""}`}>{title}</h2>
      {desc && <p className="mt-1 text-sm text-muted-foreground">{desc}</p>}
      <div className="mt-5">{children}</div>
    </section>
  );
}

function Toggle({ label, desc, defaultChecked }: { label: string; desc: string; defaultChecked?: boolean | undefined }) {
  return (
    <label className="flex items-center justify-between gap-4 py-2">
      <span><span className="block text-sm font-medium">{label}</span><span className="block text-xs text-muted-foreground">{desc}</span></span>
      <Switch defaultChecked={defaultChecked ?? false} />
    </label>
  );
}

export function SettingsPage({ account }: { account: Account }) {
  const router = useRouter();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const del = useServerFn(deleteMyAccount);
  const [msg, setMsg] = useState<{ k: "error" | "success"; t: string } | null>(null);
  const [pw, setPw] = useState<{ k: "error" | "success"; t: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  async function saveAccount(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const first = String(f.get("first") ?? "").trim().slice(0, 80);
    const last = String(f.get("last") ?? "").trim().slice(0, 80);
    if (!first || !last) return setMsg({ k: "error", t: "First and last name are required." });
    const { error } = await supabase.from("profiles").update({ first_name: first, last_name: last }).eq("user_id", account.userId);
    setMsg(error ? { k: "error", t: "Couldn't save changes." } : { k: "success", t: "Account information saved." });
    if (!error) router.invalidate();
  }

  async function changePassword(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const f = new FormData(form);
    const current = String(f.get("current") ?? "");
    const next = String(f.get("next") ?? "");
    const err = !current ? "Enter your current password." : validateNewPassword(next, String(f.get("confirm") ?? ""));
    if (err) return setPw({ k: "error", t: err });
    const { error } = await supabase.auth.updateUser({ password: next, current_password: current } as { password: string });
    if (error) return setPw({ k: "error", t: friendlyAuthError(error.message) });
    form.reset();
    setPw({ k: "success", t: "Password successfully updated." });
  }

  async function deleteAccount() {
    setDeleting(true);
    try {
      await del();
      await queryClient.cancelQueries();
      queryClient.clear();
      await supabase.auth.signOut();
      navigate({ to: "/", replace: true });
    } catch {
      setDeleting(false);
      setMsg({ k: "error", t: "We couldn't delete your account. Please try again." });
    }
  }

  return (
    <>
      <PageHeader title="Settings" subtitle="Manage your account, security, and preferences." />
      <div className="max-w-3xl space-y-6">
        <Card title="Account Information">
          <form className="space-y-4" onSubmit={saveAccount}>
            {msg && <FormAlert kind={msg.k}>{msg.t}</FormAlert>}
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="first">First Name</Label><Input id="first" name="first" defaultValue={account.firstName} /></div>
              <div className="space-y-2"><Label htmlFor="last">Last Name</Label><Input id="last" name="last" defaultValue={account.lastName} /></div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label>Email</Label><Input value={account.email} disabled /></div>
              <div className="space-y-2"><Label>Account Type</Label><Input value={account.role === "candidate" ? "Candidate" : "Recruiter"} disabled /></div>
            </div>
            <Button type="submit" className="rounded-full">Save changes</Button>
          </form>
        </Card>
        <Card title="Change Password">
          <form className="space-y-4" onSubmit={changePassword}>
            {pw && <FormAlert kind={pw.k}>{pw.t}</FormAlert>}
            <div className="space-y-2"><Label htmlFor="current">Current Password</Label><PasswordInput id="current" name="current" autoComplete="current-password" /></div>
<div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2"><Label htmlFor="next">New Password</Label><PasswordInput id="next" name="next" autoComplete="new-password" /></div>
              <div className="space-y-2"><Label htmlFor="confirm">Confirm New Password</Label><PasswordInput id="confirm" name="confirm" autoComplete="new-password" /></div>
            </div>
            <Button type="submit" className="rounded-full">Update Password</Button>
          </form>
        </Card>
        <div id="notification-preferences"><Card title="Notification Preferences" desc="Choose which notifications you receive. Changes save automatically.">
          <NotificationPreferences uid={account.userId} role={account.role} />
        </Card></div>
        <Card title="Privacy Settings">
          {account.role === "candidate" ? (<>
            <Toggle label="Visible to recruiters" desc="Let recruiters find your profile in talent search." defaultChecked />
            <Toggle label="Show current employer" desc="Display your current company on your profile." />
          </>) : (<>
            <Toggle label="Show my profile to candidates" desc="Candidates can see your name and company when you contact them." defaultChecked />
          </>)}
        </Card>
        <Card title="Delete Account" desc="Permanently delete your account and all associated data. This cannot be undone." danger>
          <ul className="mb-4 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
            <li>Removed: your sign-in, profile, photo, {account.role === "candidate" ? "resume, skills, experience, saved jobs and applications" : "recruiter profile, company images, jobs without applications and saved candidates"}, and reports you sent.</li>
            <li>Messages you sent stay visible to the other person in that conversation, shown without your profile.</li>
            <li>{account.role === "candidate" ? "Recruiters will no longer find you in search." : "Jobs that already have applications are closed and kept so candidates keep their history."}</li>
          </ul>
          <AlertDialog>
            <AlertDialogTrigger asChild><Button variant="destructive" className="rounded-full">Delete account</Button></AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                <AlertDialogDescription>This permanently removes your account, profile and uploaded files. You can't undo this.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={deleteAccount} disabled={deleting}>{deleting ? "Deleting…" : "Delete permanently"}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </Card>
      </div>
    </>
  );
}
